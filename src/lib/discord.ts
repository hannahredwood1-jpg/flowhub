import "server-only";
import type { Role, User } from "@prisma/client";
import { env } from "./env";
import { db } from "./db";
import { decrypt, encrypt } from "./crypto";

const API = "https://discord.com/api/v10";
export const ROLE_SYNC_TTL_MS = 10 * 60 * 1000; // re-check guild roles at most every 10 minutes

type GuildMember = { roles: string[]; nick?: string | null; user?: { id: string; username: string; global_name?: string | null; avatar?: string | null } };
export type MemberLookup = { status: "member"; roleIds: string[] } | { status: "not_member" } | { status: "error" };

async function discordFetch(url: string, auth: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { Authorization: auth, ...(init.headers ?? {}) }, cache: "no-store" });
  if (res.status === 429 && !retried) {
    const body = await res.json().catch(() => ({}));
    await new Promise((r) => setTimeout(r, Math.min(5000, ((body as { retry_after?: number }).retry_after ?? 1) * 1000)));
    return discordFetch(url, auth, init, true);
  }
  return res;
}

async function toLookup(res: Response): Promise<MemberLookup> {
  if (res.ok) return { status: "member", roleIds: ((await res.json()) as GuildMember).roles };
  if (res.status === 404) return { status: "not_member" }; // Unknown Member / not in guild
  console.error("Discord member lookup failed", res.status);
  return { status: "error" };
}

/** Uses the member's own OAuth token (scope guilds.members.read). Used at login. */
export async function lookupWithUserToken(accessToken: string) {
  return toLookup(await discordFetch(`${API}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, `Bearer ${accessToken}`));
}

/** Uses the server bot. Works even after the member's OAuth token expires. Used for periodic re-checks. */
export async function lookupWithBot(discordId: string) {
  return toLookup(await discordFetch(`${API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordId}`, `Bot ${env.DISCORD_BOT_TOKEN}`));
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.AUTH_DISCORD_ID,
      client_secret: env.AUTH_DISCORD_SECRET,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
}

/** Role IDs → app role. IDs (not role names) are used so a renamed or look-alike role can't grant access. */
export function roleFromRoleIds(roleIds: string[]): Role {
  if (roleIds.some((r) => env.DISCORD_ADMIN_ROLE_IDS.includes(r))) return "ADMIN";
  if (roleIds.some((r) => env.DISCORD_COACH_ROLE_IDS.includes(r))) return "COACH";
  return "MEMBER";
}

export function avatarUrl(discordId: string, avatarHash: string | null, size = 128) {
  if (!avatarHash) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) >> 22n) % 6}.png`;
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${size}`;
}

/**
 * Re-checks guild membership + roles if the last check is older than ROLE_SYNC_TTL_MS.
 * - Left the server / kicked → isGuildMember=false (locked out on next request).
 * - Coach role removed → role drops to MEMBER within 10 minutes.
 * - Discord outage → keep the last known state (never elevates), retry next request.
 */
export async function syncRolesIfStale(user: User): Promise<User> {
  if (user.rolesSyncedAt && Date.now() - user.rolesSyncedAt.getTime() < ROLE_SYNC_TTL_MS) return user;

  let lookup: MemberLookup = { status: "error" };
  const tokenUpdate: Partial<User> = {};

  if (env.DISCORD_BOT_TOKEN) {
    lookup = await lookupWithBot(user.discordId);
  } else if (user.accessTokenEnc) {
    let access = decrypt(user.accessTokenEnc);
    if (user.tokenExpiresAt && user.tokenExpiresAt.getTime() < Date.now() + 60_000 && user.refreshTokenEnc) {
      const fresh = await refreshAccessToken(decrypt(user.refreshTokenEnc));
      if (!fresh) {
        // Refresh token revoked (user de-authorized the app) → treat as signed out
        return db.user.update({ where: { id: user.id }, data: { isGuildMember: false, rolesSyncedAt: new Date() } });
      }
      access = fresh.access_token;
      Object.assign(tokenUpdate, {
        accessTokenEnc: encrypt(fresh.access_token),
        refreshTokenEnc: encrypt(fresh.refresh_token),
        tokenExpiresAt: new Date(Date.now() + fresh.expires_in * 1000),
      });
    }
    lookup = await lookupWithUserToken(access);
  }

  if (lookup.status === "error") return user;
  const data =
    lookup.status === "member"
      ? { isGuildMember: true, guildRoleIds: lookup.roleIds, role: roleFromRoleIds(lookup.roleIds) }
      : { isGuildMember: false, guildRoleIds: [], role: "MEMBER" as Role };
  return db.user.update({ where: { id: user.id }, data: { ...data, ...tokenUpdate, rolesSyncedAt: new Date() } });
}
