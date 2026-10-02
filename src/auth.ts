import NextAuth from "next-auth";
import type { DiscordProfile } from "next-auth/providers/discord";
import authConfig from "./auth.config";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { lookupWithUserToken, roleFromRoleIds, ROLE_SYNC_TTL_MS } from "@/lib/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    // Step 1 — runs once, right after Discord redirects back with a code (exchanged for tokens by Auth.js).
    async signIn({ account, profile }) {
      if (account?.provider !== "discord" || !account.access_token) return false;

      // Step 2 — guild gate: is this Discord user in OUR server?
      const lookup = await lookupWithUserToken(account.access_token);
      if (lookup.status === "not_member") return "/not-a-member?reason=guild";
      if (lookup.status === "error") return "/not-a-member?reason=discord";

      // Step 3 — role mapping + upsert (tokens encrypted before they touch the DB)
      const p = profile as DiscordProfile;
      const common = {
        username: p.username,
        globalName: p.global_name ?? null,
        avatarHash: p.avatar ?? null,
        guildRoleIds: lookup.roleIds,
        role: roleFromRoleIds(lookup.roleIds),
        isGuildMember: true,
        accessTokenEnc: encrypt(account.access_token),
        refreshTokenEnc: account.refresh_token ? encrypt(account.refresh_token) : null,
        tokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
        rolesSyncedAt: new Date(),
        lastLoginAt: new Date(),
      };
      await db.user.upsert({ where: { discordId: p.id }, create: { discordId: p.id, ...common }, update: common });
      return true;
    },

    // Step 4 — session JWT (httpOnly cookie) carries only the internal user id + a role hint.
    async jwt({ token, account }) {
      if (account) {
        const user = await db.user.findUnique({ where: { discordId: account.providerAccountId } });
        if (!user) return null;
        Object.assign(token, { uid: user.id, role: user.role, discordId: user.discordId, roleCheckedAt: Date.now() });
      } else if (token.uid && Date.now() - ((token.roleCheckedAt as number) ?? 0) > ROLE_SYNC_TTL_MS) {
        const user = await db.user.findUnique({ where: { id: token.uid as string } });
        if (!user || !user.isGuildMember) return null; // left the server → session invalidated
        Object.assign(token, { role: user.role, roleCheckedAt: Date.now() });
      }
      return token;
    },
  },
});
