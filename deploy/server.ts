// FLOWHUB production server — Bun + Hono, deployed as a single-file Railway Function.
// Build: node deploy/build.mjs  →  deploy/dist/server.js (bundles src/lib/*, keeps hono + zod as npm imports)
//
// Same security model as the Next.js version (see README "Phase 2"):
//  - Discord OAuth2 (identify + guilds.members.read), guild membership required
//  - roles from Discord role IDs, re-synced every 10 minutes (bot token preferred)
//  - session = signed httpOnly cookie holding only the user id; role always read from the DB
//  - members can only touch their own rows; coaches/admins read all, audited
import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { ZodError } from "zod";
import { SQL } from "bun";
import { gunzipSync } from "node:zlib";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { buildDashboard, buildDirectoryRow, sortDirectory, type DirectorySort, type RawAccount } from "../src/lib/viewmodel";
import { RETIRED_STRATEGIES, blendedWinRate, type StrategyKey } from "../src/lib/strategies";
import { accountInput, accountPatch, feedbackInput, journalInput, journalPatch, projectionInput, roadmapSchema, templatePatch, tradingPlanInput } from "../src/lib/validators";
import { todayET, type CatalogFirm, type DashboardData, type PersonDTO, type ProjectionDTO, type RulesDTO } from "../src/lib/types";
import type { Instrument } from "../src/lib/planner";
import { PRACTICE_MODELS, summarizePractice } from "../src/lib/practice";
import { clampPace, expectedPassed, nudgeGapDays, paceStatus, PACE_MAX_NUDGES } from "../src/lib/schoolPace";
import { SCHOOL_MODULES, SCHOOL_MODULE_IDS, summarizeSchool, type ModuleProgress, type SchoolAttemptRow, type SchoolState } from "../src/lib/school";
import { cleanPlanModels, type TradingPlanDTO } from "../src/lib/tradingPlan";
import { VAULT_MODULE_IDS, hashCode, makeCode, vaultPassed } from "../src/lib/vault";

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const env = Bun.env;
const ids = (s?: string) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const CFG = {
  publicUrl: (env.PUBLIC_URL ?? "").replace(/\/$/, ""),
  clientId: env.DISCORD_CLIENT_ID ?? "",
  clientSecret: env.DISCORD_CLIENT_SECRET ?? "",
  guildId: env.DISCORD_GUILD_ID ?? "",
  adminRoles: ids(env.DISCORD_ADMIN_ROLE_IDS),
  coachRoles: ids(env.DISCORD_COACH_ROLE_IDS),
  memberRoles: ids(env.DISCORD_MEMBER_ROLE_IDS), // roles allowed in once launched (empty = whole server)
  mentorshipRoles: ids(env.DISCORD_MENTORSHIP_ROLE_IDS), // roles that count as mentorship for the ECHO X ORBIT vault (a role whose name contains "mentor" also counts)
  launched: (env.FLOWHUB_LAUNCHED ?? "").toLowerCase() === "true", // false = staff only
  botToken: env.DISCORD_BOT_TOKEN ?? "",
  sessionSecret: env.SESSION_SECRET ?? "",
  encKey: Buffer.from(env.TOKEN_ENCRYPTION_KEY ?? "", "base64"),
};
const discordReady = () => !!(CFG.clientId && CFG.clientSecret && CFG.guildId && CFG.publicUrl);
if (CFG.sessionSecret.length < 32) throw new Error("SESSION_SECRET missing or too short");
if (CFG.encKey.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes base64");

const sql = new SQL({ url: env.DATABASE_URL!, tls: true, max: 8, idleTimeout: 30 });
const DISCORD = "https://discord.com/api/v10";
const ROLE_TTL = 10 * 60 * 1000;
const SESSION_DAYS = 7;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const n = (v: unknown) => (v == null ? null : Number(v));
/** JS string[] → Postgres array literal, e.g. {"a","b"} (use with ::text[]) */
const pgArray = (xs: string[]) => `{${xs.map((x) => `"${x.replace(/["\\]/g, "\\$&")}"`).join(",")}}`;
/** UPDATE only the provided columns. Keys come from zod-parsed input (unknown keys stripped), so they're a fixed whitelist. */
async function patchRow(table: string, id: string, data: Record<string, unknown>, casts: Record<string, string> = {}) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined && /^[A-Za-z]+$/.test(k));
  if (!keys.length) return;
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}${casts[k] ? (casts[k] === "date" ? "::date" : `::"${casts[k]}"`) : ""}`);
  await sql.unsafe(`update "${table}" set ${sets.join(", ")}, "updatedAt" = now() where id = $${keys.length + 1}`, [...keys.map((k) => data[k] ?? null), id]);
}

function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", CFG.encKey, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}
function decrypt(payload: string) {
  const [, iv, tag, enc] = payload.split(".");
  const d = createDecipheriv("aes-256-gcm", CFG.encKey, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64url")), d.final()]).toString("utf8");
}

type Role = "MEMBER" | "COACH" | "ADMIN";
type UserRow = {
  id: string; discordId: string; username: string; globalName: string | null; avatarHash: string | null; role: Role;
  isGuildMember: boolean; guildRoleIds: string[] | null; accessTokenEnc: string | null; refreshTokenEnc: string | null; tokenExpiresAt: Date | null; rolesSyncedAt: Date | null;
};
const isStaff = (u: { role: Role }) => u.role === "COACH" || u.role === "ADMIN";
const roleFrom = (roleIds: string[]): Role =>
  roleIds.some((r) => CFG.adminRoles.includes(r)) ? "ADMIN" : roleIds.some((r) => CFG.coachRoles.includes(r)) ? "COACH" : "MEMBER";
/** Access gate: staff always; everyone else only after launch and only with an allowed role. */
const accessFor = (roleIds: string[]): "ok" | "soon" | "role" => {
  if (roleFrom(roleIds) !== "MEMBER") return "ok";
  if (!CFG.launched) return "soon";
  if (CFG.memberRoles.length && !roleIds.some((r) => CFG.memberRoles.includes(r))) return "role";
  return "ok";
};

function avatarUrl(discordId: string, hash: string | null) {
  if (!/^\d+$/.test(discordId)) return "https://cdn.discordapp.com/embed/avatars/0.png"; // local (non-Discord) accounts
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) >> 22n) % 6}.png`;
  return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=128`;
}
const person = (u: Pick<UserRow, "id" | "discordId" | "username" | "globalName" | "avatarHash" | "role">): PersonDTO => ({
  id: u.id, name: u.globalName ?? u.username, avatarUrl: avatarUrl(u.discordId, u.avatarHash), role: u.role, discordId: u.discordId,
});

// ─────────────────────────────────────────────────────────────
// Discord
// ─────────────────────────────────────────────────────────────
type Lookup = { status: "member"; roleIds: string[] } | { status: "not_member" } | { status: "error" };

async function dfetch(url: string, init: RequestInit, retried = false): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 429 && !retried) {
    const b = (await res.json().catch(() => ({}))) as { retry_after?: number };
    await Bun.sleep(Math.min(5000, (b.retry_after ?? 1) * 1000));
    return dfetch(url, init, true);
  }
  return res;
}
async function toLookup(res: Response): Promise<Lookup> {
  if (res.ok) return { status: "member", roleIds: ((await res.json()) as { roles: string[] }).roles };
  if (res.status === 404) return { status: "not_member" };
  console.error("discord member lookup", res.status, await res.text().catch(() => ""));
  return { status: "error" };
}
const lookupUser = (token: string) => dfetch(`${DISCORD}/users/@me/guilds/${CFG.guildId}/member`, { headers: { Authorization: `Bearer ${token}` } }).then(toLookup);
const ROLE_NAMES = new Map<string, string>();
// Log the server's role names → IDs on boot so the operator can map roles without Developer Mode.
if (CFG.botToken && CFG.guildId)
  fetch(`${DISCORD}/guilds/${CFG.guildId}/roles`, { headers: { Authorization: `Bot ${CFG.botToken}` } })
    .then((r) => (r.ok ? r.json() : r.text().then((t) => Promise.reject(`${r.status} ${t}`))))
    .then((roles: { id: string; name: string }[]) => { for (const x of roles) ROLE_NAMES.set(x.id, x.name); console.log("FLOWHUB roles:", roles.map((x) => `${x.name}=${x.id}`).join(" | ")); })
    .catch((e) => console.error("FLOWHUB roles lookup failed", e));
const lookupBot = (discordId: string) => dfetch(`${DISCORD}/guilds/${CFG.guildId}/members/${discordId}`, { headers: { Authorization: `Bot ${CFG.botToken}` } }).then(toLookup);

async function oauthToken(body: Record<string, string>) {
  const res = await fetch(`${DISCORD}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CFG.clientId, client_secret: CFG.clientSecret, ...body }),
  });
  if (!res.ok) { console.error("oauth token", res.status, await res.text().catch(() => "")); return null; }
  return (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
}

async function syncRolesIfStale(u: UserRow): Promise<UserRow> {
  if (u.rolesSyncedAt && Date.now() - u.rolesSyncedAt.getTime() < ROLE_TTL) return u;
  let lookup: Lookup = { status: "error" };
  let tokens: { a: string; r: string; e: Date } | null = null;
  if (CFG.botToken) lookup = await lookupBot(u.discordId);
  else if (u.accessTokenEnc) {
    let access = decrypt(u.accessTokenEnc);
    if (u.tokenExpiresAt && u.tokenExpiresAt.getTime() < Date.now() + 60_000 && u.refreshTokenEnc) {
      const fresh = await oauthToken({ grant_type: "refresh_token", refresh_token: decrypt(u.refreshTokenEnc) });
      if (!fresh) {
        const [row] = await sql`update "User" set "isGuildMember" = false, "rolesSyncedAt" = now() where id = ${u.id} returning *`;
        return row as UserRow;
      }
      access = fresh.access_token;
      tokens = { a: encrypt(fresh.access_token), r: encrypt(fresh.refresh_token), e: new Date(Date.now() + fresh.expires_in * 1000) };
    }
    lookup = await lookupUser(access);
  }
  if (lookup.status === "error") return u; // Discord down: keep last known state, never elevate
  const member = lookup.status === "member";
  const roleIds = member ? lookup.roleIds : [];
  if (tokens) await sql`update "User" set "accessTokenEnc" = ${tokens.a}, "refreshTokenEnc" = ${tokens.r}, "tokenExpiresAt" = ${tokens.e} where id = ${u.id}`;
  const [row] = await sql`
    update "User" set "isGuildMember" = ${member}, "guildRoleIds" = ${pgArray(roleIds)}::text[], "role" = ${member ? roleFrom(roleIds) : "MEMBER"}::"Role",
      "rolesSyncedAt" = now()
    where id = ${u.id} returning *`;
  return row as UserRow;
}

// ─────────────────────────────────────────────────────────────
// Data loading (mirrors src/lib/dashboard.ts)
// ─────────────────────────────────────────────────────────────
async function loadDashboard(viewer: UserRow, traderId: string): Promise<DashboardData> {
  const [trader] = await sql`select * from "User" where id = ${traderId}`;
  if (!trader) throw new HttpError(404, "Not found");
  const [[rm], accounts, journal, feedback, [pj], practiceRows, [sp], attempts, [tp]] = await Promise.all([
    sql`select * from "Roadmap" where "userId" = ${traderId}`,
    sql`select *, to_char("startDate", 'YYYY-MM-DD') as "startISO" from "MemberAccount" where "userId" = ${traderId} order by "createdAt"`,
    sql`select j.*, to_char(j."tradeDate", 'YYYY-MM-DD') as "dateISO",
               (select count(*)::int from "CoachFeedback" f where f."journalEntryId" = j.id) as "fb"
        from "JournalEntry" j where j."userId" = ${traderId} and j."tradeDate" >= current_date - 400`,
    sql`select f.*, c."globalName" as "cName", c.username as "cUser", c."discordId" as "cDid", c."avatarHash" as "cAv"
        from "CoachFeedback" f join "User" c on c.id = f."coachId" where f."traderId" = ${traderId} order by f."createdAt" desc limit 100`,
    sql`select name, config, "updatedAt" from "Projection" where "userId" = ${traderId}`,
    sql`select model, drill, ok, tags, "createdAt" from "PracticeRep" where "userId" = ${traderId} and "createdAt" > now() - interval '120 days' order by "createdAt"`,
    sql`select state, unlocks from "SchoolProgress" where "userId" = ${traderId}`,
    sql`select kind, ref, score, total, pass, "createdAt" from "SchoolAttempt" where "userId" = ${traderId} order by "createdAt" desc limit 12`,
    sql`select plan, "updatedAt" from "TradingPlan" where "userId" = ${traderId}`,
  ]);
  const jsonOf = <T,>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;
  const strategies = ((rm?.strategies ?? []) as StrategyKey[]).filter((k) => !RETIRED_STRATEGIES.includes(k)); // retired NYFLOW / ASIAFLOW setups
  return buildDashboard({
    viewer: person(viewer),
    trader: person(trader as UserRow),
    today: todayET(),
    roadmap: rm
      ? {
          monthlyIncomeGoal: n(rm.monthlyIncomeGoal)!, tradingDaysPerWeek: rm.tradingDaysPerWeek, strategyMode: rm.strategyMode,
          multiSession: rm.multiSession, strategies,
          winRate: blendedWinRate({ mode: rm.strategyMode, multiSession: rm.multiSession, strategies }),
          avgRR: n(rm.avgRR)!, tradesPerDay: n(rm.tradesPerDay)!, primaryInstrument: rm.primaryInstrument as Instrument, avgStopPoints: n(rm.avgStopPoints)!,
        }
      : null,
    accounts: accounts.map((a: Record<string, any>): RawAccount => ({
      id: a.id, templateId: a.templateId, nickname: a.nickname, stage: a.stage, startDate: a.startISO, quantity: a.quantity,
      targetPassDays: a.targetPassDays, riskPerTradeOverride: n(a.riskPerTradeOverride), dailyLossLimitOverride: a.dailyLossLimitOverride,
      rules: (typeof a.ruleSnapshot === "string" ? JSON.parse(a.ruleSnapshot) : a.ruleSnapshot) as RulesDTO,
    })),
    journal: journal.map((j: Record<string, any>) => ({
      id: j.id, memberAccountId: j.memberAccountId, tradeDate: j.dateISO, ticker: j.ticker, direction: j.direction, setupType: j.setupType,
      contracts: j.contracts, riskPct: n(j.riskPct), riskDollars: n(j.riskDollars), rrPlanned: n(j.rrPlanned), rrRealized: n(j.rrRealized),
      outcome: j.outcome, pnl: n(j.pnl)!, emotion: j.emotion, followedPlan: j.followedPlan, screenshotUrl: j.screenshotUrl, notes: j.notes, feedbackCount: j.fb,
    })),
    feedback: feedback.map((f: Record<string, any>) => ({
      id: f.id, coach: { name: f.cName ?? f.cUser, avatarUrl: avatarUrl(f.cDid, f.cAv) }, kind: f.kind, body: f.body,
      journalEntryId: f.journalEntryId, memberAccountId: f.memberAccountId,
      createdAt: new Date(f.createdAt).toISOString(), readAt: f.readAt ? new Date(f.readAt).toISOString() : null,
    })),
    school: sp || attempts.length ? summarizeSchool(sp ? jsonOf<SchoolState>(sp.state) : null, sp?.unlocks ?? [], attempts as SchoolAttemptRow[]) : null,
    tradingPlan: tp ? { ...jsonOf<TradingPlanDTO>(tp.plan), models: cleanPlanModels(jsonOf<TradingPlanDTO>(tp.plan).models as string[]), done: true, updatedAt: new Date(tp.updatedAt).toISOString() } : null,
    practice: summarizePractice(practiceRows as { model: string; drill: string; ok: boolean; tags: string[]; createdAt: Date }[]),
    projection: pj
      ? { ...((typeof pj.config === "string" ? JSON.parse(pj.config) : pj.config) as Omit<ProjectionDTO, "name" | "updatedAt">), name: pj.name, updatedAt: new Date(pj.updatedAt).toISOString() }
      : null,
  });
}

async function loadCatalog(): Promise<CatalogFirm[]> {
  const rows = await sql`select t.*, f.name as firm from "AccountTemplate" t join "PropFirm" f on f.id = t."firmId"
                         where t."isActive" order by f.name, t."planName", t."accountSize"`;
  const out: CatalogFirm[] = [];
  for (const t of rows) {
    let f = out.find((x) => x.firm === t.firm);
    if (!f) out.push((f = { firm: t.firm, plans: [] }));
    let p = f.plans.find((x) => x.plan === t.planName);
    if (!p) f.plans.push((p = { plan: t.planName, sizes: [] }));
    p.sizes.push({ id: t.id, accountSize: t.accountSize, profitTarget: t.profitTarget, maxLoss: t.maxLoss, dailyLossLimit: t.dailyLossLimit,
      consistencyPct: t.consistencyPct, minDays: t.minDays, drawdownNote: t.drawdownNote, dataStatus: t.dataStatus,
      drawdownModel: t.drawdownModel, maxMinis: t.maxMinis, maxMicros: t.maxMicros, profitSplit: t.profitSplit });
  }
  return out;
}

const audit = (actorId: string, action: string, targetId: string | null = null, meta: object | null = null) =>
  sql`insert into "AuditLog" (id, "actorId", action, "targetId", meta) values (${randomUUID()}, ${actorId}, ${action}, ${targetId}, ${meta ? JSON.stringify(meta) : null}::jsonb)`;

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
type Env = { Variables: { user: UserRow } };
const app = new Hono<Env>();

const cookieOpts = { httpOnly: true, secure: true, sameSite: "Lax" as const, path: "/" };

async function currentUser(c: Context): Promise<UserRow | null> {
  const token = getCookie(c, "fh_session");
  if (!token) return null;
  try {
    const p = (await verify(token, CFG.sessionSecret, "HS256")) as { uid: string };
    const [u] = await sql`select * from "User" where id = ${p.uid}`;
    if (!u) return null;
    if (String(u.discordId).startsWith("local:")) {
      const [a] = await sql`select disabled, "expiresAt" from "LocalAccount" where "userId" = ${u.id}`;
      return a && !a.disabled && !(a.expiresAt && new Date(a.expiresAt) < new Date()) ? (u as UserRow) : null;
    }
    const synced = await syncRolesIfStale(u as UserRow);
    const gr = synced.guildRoleIds as unknown;
    const roleIds = Array.isArray(gr) ? gr.map(String) : typeof gr === "string" ? gr.replace(/[{}"]/g, "").split(",").filter(Boolean) : [];
    return synced.isGuildMember && accessFor(roleIds) === "ok" ? synced : null;
  } catch { return null; }
}

// Security headers + errors
app.use("*", async (c, next) => {
  await next();
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Strict-Transport-Security", "max-age=31536000");
});
app.onError((e, c) => {
  if (e instanceof HttpError) return c.json({ error: e.message }, e.status as 400);
  if (e instanceof ZodError) return c.json({ error: e.issues[0]?.message ?? "Invalid input", issues: e.flatten() }, 400);
  console.error(e);
  return c.json({ error: "Server error" }, 500);
});

// Old Railway address → the custom domain (health checks stay on any host)
app.use("*", async (c, next) => {
  const host = (c.req.header("host") ?? "").toLowerCase();
  if (CFG.publicUrl && host.endsWith(".up.railway.app") && !c.req.path.startsWith("/healthz") && !CFG.publicUrl.includes(host))
    return c.redirect(CFG.publicUrl + c.req.path + (new URL(c.req.url).search || ""), 301);
  await next();
});
app.get("/healthz", async (c) => c.json({ ok: true, db: (await sql`select 1 as ok`)[0].ok === 1, discord: discordReady() }));

// ── Auth ────────────────────────────────────────────────────
app.get("/auth/discord", (c) => {
  if (!discordReady()) return c.redirect("/#setup");
  const state = randomBytes(16).toString("base64url");
  setCookie(c, "fh_state", state, { ...cookieOpts, maxAge: 600 });
  const q = new URLSearchParams({
    client_id: CFG.clientId, response_type: "code", redirect_uri: `${CFG.publicUrl}/auth/callback`,
    scope: "identify guilds.members.read", state, prompt: "none",
  });
  return c.redirect(`https://discord.com/oauth2/authorize?${q}`);
});

app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state") ?? "";
  const expected = getCookie(c, "fh_state") ?? "";
  deleteCookie(c, "fh_state", { path: "/" });
  if (!code || !expected || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected)))
    return c.redirect("/#denied-signin");

  const tok = await oauthToken({ grant_type: "authorization_code", code, redirect_uri: `${CFG.publicUrl}/auth/callback` });
  if (!tok) return c.redirect("/#denied-signin");
  const meRes = await fetch(`${DISCORD}/users/@me`, { headers: { Authorization: `Bearer ${tok.access_token}` } });
  if (!meRes.ok) return c.redirect("/#denied-discord");
  const me = (await meRes.json()) as { id: string; username: string; global_name?: string | null; avatar?: string | null };

  // Guild gate — not in the FLOWMTD server → no account is created
  const lookup = await lookupUser(tok.access_token);
  if (lookup.status === "not_member") return c.redirect("/#denied-guild");
  if (lookup.status === "error") return c.redirect("/#denied-discord");

  const access = accessFor(lookup.roleIds);
  if (access !== "ok") return c.redirect(`/#denied-${access}`);

  const role = roleFrom(lookup.roleIds);
  const [u] = await sql`
    insert into "User" (id, "discordId", username, "globalName", "avatarHash", role, "guildRoleIds", "isGuildMember",
                        "accessTokenEnc", "refreshTokenEnc", "tokenExpiresAt", "rolesSyncedAt", "lastLoginAt")
    values (${randomUUID()}, ${me.id}, ${me.username}, ${me.global_name ?? null}, ${me.avatar ?? null}, ${role}::"Role", ${pgArray(lookup.roleIds)}::text[], true,
            ${encrypt(tok.access_token)}, ${encrypt(tok.refresh_token)}, ${new Date(Date.now() + tok.expires_in * 1000)}, now(), now())
    on conflict ("discordId") do update set username = excluded.username, "globalName" = excluded."globalName", "avatarHash" = excluded."avatarHash",
      role = excluded.role, "guildRoleIds" = excluded."guildRoleIds", "isGuildMember" = true, "accessTokenEnc" = excluded."accessTokenEnc",
      "refreshTokenEnc" = excluded."refreshTokenEnc", "tokenExpiresAt" = excluded."tokenExpiresAt", "rolesSyncedAt" = now(), "lastLoginAt" = now()
    returning id`;
  const jwt = await sign({ uid: u.id, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 }, CFG.sessionSecret, "HS256");
  setCookie(c, "fh_session", jwt, { ...cookieOpts, maxAge: SESSION_DAYS * 86400 });
  return c.redirect("/#home");
});

app.get("/auth/logout", (c) => {
  deleteCookie(c, "fh_session", { path: "/" });
  return c.redirect("/");
});

// ── Local (non-Discord) accounts: created, limited and removed by coaches and admins ──
// The "LocalAccount" table is created by migration 0008 (the app role cannot create tables).
const loginFails = new Map<string, { n: number; until: number }>();
app.post("/auth/local", async (c) => {
  const origin = c.req.header("origin");
  if (origin && new URL(origin).host !== (c.req.header("host") ?? "")) throw new HttpError(403, "Bad origin");
  const b = (await c.req.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = String(b.username ?? "").trim().toLowerCase().slice(0, 40), pw = String(b.password ?? "").slice(0, 200);
  const key = `${(c.req.header("x-forwarded-for") ?? "").split(",")[0].trim()}|${username}`, f = loginFails.get(key);
  if (f && f.n >= 5 && f.until > Date.now()) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const [a] = await sql`select "userId", "passwordHash", disabled, "expiresAt" from "LocalAccount" where username = ${username}`;
  if (a && !a.passwordHash) throw new HttpError(403, "Your account is not set up yet. Use the link in your invite email, or ask your coach to resend it.");
  const ok = a ? await Bun.password.verify(pw, a.passwordHash) : (await Bun.password.verify(pw, "$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG1d6wZq7Xz2E").catch(() => false), false);
  if (!ok) { loginFails.set(key, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 15 * 60_000 }); throw new HttpError(401, "Invalid username or password"); }
  if (a.disabled || (a.expiresAt && new Date(a.expiresAt) < new Date())) throw new HttpError(403, "Your access has ended. Ask your coach.");
  loginFails.delete(key);
  await sql`update "User" set "lastLoginAt" = now() where id = ${a.userId}`;
  const jwt = await sign({ uid: a.userId, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 }, CFG.sessionSecret, "HS256");
  setCookie(c, "fh_session", jwt, { ...cookieOpts, maxAge: SESSION_DAYS * 86400 });
  return c.json({ ok: true });
});

const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const mailFrom = () => process.env.MAIL_FROM || "FLOWHUB <no-reply@flowmtd.com>";
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: mailFrom(), to: [to], subject, html }) });
    if (!r.ok) console.error("mail", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) { console.error("mail", e); return false; }
}
const baseUrl = () => (CFG.publicUrl || "").replace(/\/$/, "");
async function makeToken(userId: string, kind: "invite" | "reset"): Promise<string> {
  const t = randomBytes(32).toString("base64url");
  await sql`delete from "LocalToken" where "userId" = ${userId} and kind = ${kind}`;
  await sql`insert into "LocalToken" (hash, "userId", kind, "expiresAt") values (${sha(t)}, ${userId}, ${kind}, ${new Date(Date.now() + (kind === "invite" ? 48 : 1) * 3600_000)})`;
  return t;
}
const mailHtml = (name: string, kind: "invite" | "reset", link: string) => `<div style="font-family:Arial,sans-serif;background:#030405;color:#e6ebf2;padding:32px"><div style="max-width:480px;margin:auto"><div style="font-weight:900;font-size:22px;letter-spacing:.02em"><span style="color:#ff6a00">F</span>LOWHUB</div><h2 style="margin:24px 0 8px">${kind === "invite" ? `Welcome, ${name.replace(/[<>&"]/g, "")}` : "Reset your password"}</h2><p style="color:#929fb2;line-height:1.6">${kind === "invite" ? "Your coach has set up your FLOWHUB access. Choose a password to finish setting up your account. This link works once and expires in 48 hours." : "Use the button below to choose a new password. This link works once and expires in 1 hour. If you did not ask for this, you can ignore this email."}</p><p style="margin:24px 0"><a href="${link}" style="background:#ff6a00;color:#160a00;font-weight:700;padding:12px 20px;text-decoration:none;border-radius:8px">${kind === "invite" ? "Set up my account" : "Choose a new password"}</a></p><p style="color:#66717f;font-size:12px;word-break:break-all">${link}</p></div></div>`;
async function inviteMail(userId: string, name: string, email: string, kind: "invite" | "reset") {
  const link = `${baseUrl()}/setup?token=${await makeToken(userId, kind)}`;
  const sent = await sendMail(email, kind === "invite" ? "Set up your FLOWHUB account" : "Reset your FLOWHUB password", mailHtml(name, kind, link));
  return { sent, link };
}
const pageShell = (body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FLOWHUB</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#030405;color:#e6ebf2;font:15px/1.5 Inter,system-ui,sans-serif}.c{width:min(420px,92vw);padding:28px;border:1px solid #28313e;background:#0a0d12;border-radius:12px}.l{font:900 24px Archivo,Arial Black,sans-serif;letter-spacing:.01em;margin-bottom:18px}.l b{color:#ff6a00}h1{font-size:20px;margin:0 0 6px}p{color:#929fb2;margin:0 0 16px}input{width:100%;box-sizing:border-box;padding:12px;margin:0 0 10px;border:1px solid #28313e;border-radius:8px;background:#05070a;color:#e6ebf2;font:inherit}button{width:100%;padding:12px;border:0;border-radius:8px;background:#ff6a00;color:#160a00;font-weight:700;font-size:15px;cursor:pointer}#e{color:#ff5d73;margin:8px 0 0;min-height:20px}</style></head><body><div class="c"><div class="l"><b>F</b>LOWHUB</div>${body}</div></body></html>`;
app.get("/setup", async (c) => {
  const t = c.req.query("token") ?? "";
  const [row] = await sql`select t.kind, t."expiresAt", t."usedAt", u."globalName" as name from "LocalToken" t join "User" u on u.id = t."userId" where t.hash = ${sha(t)}`;
  if (!row || row.usedAt || new Date(row.expiresAt) < new Date()) return c.html(pageShell("<h1>This link has expired</h1><p>Ask your coach to send a new invite, or use “Forgot password?” on the sign-in page.</p><p><a href=\"/\" style=\"color:#8cc4ff\">Back to sign in</a></p>"), 410);
  return c.html(pageShell(`<h1>${row.kind === "invite" ? "Set up your account" : "Choose a new password"}</h1><p>Pick a password with at least 8 characters.</p><form id="f"><input id="p" type="password" placeholder="New password" autocomplete="new-password" minlength="8" required><input id="q" type="password" placeholder="Confirm password" autocomplete="new-password" minlength="8" required><button>Continue</button><div id="e"></div></form><script>document.getElementById("f").onsubmit=async function(e){e.preventDefault();var p=document.getElementById("p").value,q=document.getElementById("q").value,er=document.getElementById("e");if(p!==q){er.textContent="Passwords do not match.";return}var r=await fetch("/auth/local/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:${JSON.stringify(t)},password:p})});var j=await r.json().catch(function(){return{}});if(r.ok){location.href="/#home"}else{er.textContent=j.error||"Something went wrong."}}</script>`));
});
app.post("/auth/local/setup", async (c) => {
  const origin = c.req.header("origin");
  if (origin && new URL(origin).host !== (c.req.header("host") ?? "")) throw new HttpError(403, "Bad origin");
  const b = (await c.req.json().catch(() => ({}))) as { token?: string; password?: string };
  const pw = String(b.password ?? "");
  if (pw.length < 8 || pw.length > 100) throw new HttpError(400, "Password must be 8–100 characters");
  const [t] = await sql`select "userId", "expiresAt", "usedAt" from "LocalToken" where hash = ${sha(String(b.token ?? ""))}`;
  if (!t || t.usedAt || new Date(t.expiresAt) < new Date()) throw new HttpError(410, "This link has expired. Ask for a new one.");
  const [a] = await sql`select days, "activatedAt" from "LocalAccount" where "userId" = ${t.userId}`;
  if (!a) throw new HttpError(404, "Account not found");
  const exp = !a.activatedAt && a.days ? new Date(Date.now() + a.days * 86400_000) : null;
  await sql`update "LocalAccount" set "passwordHash" = ${await Bun.password.hash(pw)}, "activatedAt" = coalesce("activatedAt", now()), "expiresAt" = coalesce(${exp}, "expiresAt") where "userId" = ${t.userId}`;
  await sql`update "LocalToken" set "usedAt" = now() where "userId" = ${t.userId}`;
  const [acct] = await sql`select disabled, "expiresAt" from "LocalAccount" where "userId" = ${t.userId}`;
  if (acct.disabled) throw new HttpError(403, "Your access has ended. Ask your coach.");
  await sql`update "User" set "lastLoginAt" = now() where id = ${t.userId}`;
  const jwt = await sign({ uid: t.userId, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 }, CFG.sessionSecret, "HS256");
  setCookie(c, "fh_session", jwt, { ...cookieOpts, maxAge: SESSION_DAYS * 86400 });
  return c.json({ ok: true });
});
const forgotHits = new Map<string, number[]>();
app.post("/auth/local/forgot", async (c) => {
  const origin = c.req.header("origin");
  if (origin && new URL(origin).host !== (c.req.header("host") ?? "")) throw new HttpError(403, "Bad origin");
  const ip = (c.req.header("x-forwarded-for") ?? "").split(",")[0].trim(), hits = (forgotHits.get(ip) ?? []).filter((x) => x > Date.now() - 3600_000);
  if (hits.length >= 5) throw new HttpError(429, "Too many requests. Try again later.");
  forgotHits.set(ip, [...hits, Date.now()]);
  const email = String(((await c.req.json().catch(() => ({}))) as { email?: string }).email ?? "").trim().toLowerCase().slice(0, 120);
  const [a] = await sql`select a."userId", a.email, a.disabled, a."expiresAt", a."passwordHash", u."globalName" as name from "LocalAccount" a join "User" u on u.id = a."userId" where lower(a.email) = ${email}`;
  if (a && a.email && !a.disabled && !(a.expiresAt && new Date(a.expiresAt) < new Date())) await inviteMail(a.userId, a.name ?? "", a.email, a.passwordHash ? "reset" : "invite");
  return c.json({ ok: true }); // same answer whether or not the address exists
});

// ── API guard: session + same-origin writes ─────────────────
app.use("/api/*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const origin = c.req.header("origin");
    const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
    if (!origin || new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
  }
  const user = await currentUser(c);
  if (!user) throw new HttpError(401, "Sign in with Discord");
  c.set("user", user);
  await next();
});
const staffOnly = (c: Context<Env>) => { if (!isStaff(c.get("user"))) throw new HttpError(403, "Coach or Admin role required"); };

app.get("/api/dashboard", async (c) => c.json(await loadDashboard(c.get("user"), c.get("user").id)));
app.get("/api/catalog", async (c) => c.json(await loadCatalog()));

app.put("/api/roadmap", async (c) => {
  const u = c.get("user");
  const d = roadmapSchema.parse(await c.req.json());
  await sql`
    insert into "Roadmap" (id, "userId", "monthlyIncomeGoal", "tradingDaysPerWeek", "strategyMode", "multiSession", strategies, "avgRR", "tradesPerDay", "primaryInstrument", "avgStopPoints")
    values (${randomUUID()}, ${u.id}, ${d.monthlyIncomeGoal}, ${d.tradingDaysPerWeek}, ${d.strategyMode}::"StrategyMode", ${d.multiSession}, ${pgArray(d.strategies)}::text[],
            ${d.avgRR}, ${d.tradesPerDay}, ${d.primaryInstrument}::"Instrument", ${d.avgStopPoints})
    on conflict ("userId") do update set "monthlyIncomeGoal" = excluded."monthlyIncomeGoal", "tradingDaysPerWeek" = excluded."tradingDaysPerWeek",
      "strategyMode" = excluded."strategyMode", "multiSession" = excluded."multiSession", strategies = excluded.strategies, "avgRR" = excluded."avgRR",
      "tradesPerDay" = excluded."tradesPerDay", "primaryInstrument" = excluded."primaryInstrument", "avgStopPoints" = excluded."avgStopPoints", "updatedAt" = now()`;
  return c.json({ ok: true });
});

// Accounts
app.post("/api/accounts", async (c) => {
  const u = c.get("user");
  const d = accountInput.parse(await c.req.json());
  const [t] = await sql`select t.*, f.name as firm from "AccountTemplate" t join "PropFirm" f on f.id = t."firmId" where t.id = ${d.templateId} and t."isActive"`;
  if (!t) throw new HttpError(400, "Unknown account");
  const snapshot: RulesDTO = {
    firm: t.firm, planName: t.planName, accountSize: t.accountSize, profitTarget: t.profitTarget, maxLoss: t.maxLoss, drawdownModel: t.drawdownModel,
    drawdownNote: t.drawdownNote, dailyLossLimit: t.dailyLossLimit, dailyLossNote: t.dailyLossNote, consistencyPct: t.consistencyPct,
    consistencyNote: t.consistencyNote, minDays: t.minDays, maxMinis: t.maxMinis, maxMicros: t.maxMicros, profitSplit: t.profitSplit,
    notes: t.notes, sourceUrl: t.sourceUrl, dataStatus: t.dataStatus,
  };
  const id = randomUUID();
  await sql`insert into "MemberAccount" (id, "userId", "templateId", nickname, stage, "startDate", quantity, "targetPassDays", "riskPerTradeOverride", "dailyLossLimitOverride", "ruleSnapshot")
            values (${id}, ${u.id}, ${t.id}, ${d.nickname ?? null}, ${d.stage}::"AccountStage", ${d.startDate}::date, ${d.quantity}, ${d.targetPassDays ?? null},
                    ${d.riskPerTradeOverride ?? null}, ${d.dailyLossLimitOverride ?? null}, ${JSON.stringify(snapshot)}::jsonb)`;
  return c.json({ id });
});
async function ownAccount(c: Context<Env>) {
  const [a] = await sql`select id from "MemberAccount" where id = ${c.req.param("id")} and "userId" = ${c.get("user").id}`;
  if (!a) throw new HttpError(404, "Not found");
  return a.id as string;
}
app.patch("/api/accounts/:id", async (c) => {
  const id = await ownAccount(c);
  const d = accountPatch.parse(await c.req.json());
  await patchRow("MemberAccount", id, d, { stage: "AccountStage", startDate: "date" });
  return c.json({ ok: true });
});
app.delete("/api/accounts/:id", async (c) => {
  const id = await ownAccount(c);
  await sql`delete from "MemberAccount" where id = ${id}`;
  return c.json({ ok: true });
});

// Journal
async function checkOwnAccount(userId: string, accountId?: string | null) {
  if (!accountId) return;
  const [a] = await sql`select id from "MemberAccount" where id = ${accountId} and "userId" = ${userId}`;
  if (!a) throw new HttpError(400, "Unknown account");
}
app.post("/api/journal", async (c) => {
  const u = c.get("user");
  const d = journalInput.parse(await c.req.json());
  await checkOwnAccount(u.id, d.memberAccountId);
  const id = randomUUID();
  await sql`insert into "JournalEntry" (id, "userId", "memberAccountId", "tradeDate", ticker, direction, "setupType", contracts, "riskPct", "riskDollars",
              "rrPlanned", "rrRealized", outcome, pnl, emotion, "followedPlan", "screenshotUrl", notes)
            values (${id}, ${u.id}, ${d.memberAccountId ?? null}, ${d.tradeDate}::date, ${d.ticker}, ${d.direction}::"Direction", ${d.setupType},
              ${d.contracts ?? null}, ${d.riskPct ?? null}, ${d.riskDollars ?? null}, ${d.rrPlanned ?? null}, ${d.rrRealized ?? null},
              ${d.outcome}::"Outcome", ${d.pnl}, ${d.emotion}::"Emotion", ${d.followedPlan}, ${d.screenshotUrl ?? null}, ${d.notes ?? null})`;
  return c.json({ id });
});
async function ownEntry(c: Context<Env>) {
  const [e] = await sql`select id from "JournalEntry" where id = ${c.req.param("id")} and "userId" = ${c.get("user").id}`;
  if (!e) throw new HttpError(404, "Not found"); // coaches can read journals but never edit them
  return e.id as string;
}
app.patch("/api/journal/:id", async (c) => {
  const id = await ownEntry(c);
  const d = journalPatch.parse(await c.req.json());
  await checkOwnAccount(c.get("user").id, d.memberAccountId);
  await patchRow("JournalEntry", id, d, { tradeDate: "date", direction: "Direction", outcome: "Outcome", emotion: "Emotion" });
  return c.json({ ok: true });
});
app.delete("/api/journal/:id", async (c) => {
  const id = await ownEntry(c);
  await sql`delete from "JournalEntry" where id = ${id}`;
  return c.json({ ok: true });
});

// Routine: pre-session checklist + weekly self-review. Private to the member (coaches never see these).
const LOG_KINDS = new Set(["checklist", "review"]);
app.get("/api/log", async (c) => {
  const rows = await sql`select kind, day::text as day, data from "MemberLog" where "userId" = ${c.get("user").id} and day >= (current_date - 120) order by day desc`;
  return c.json(rows.map((r: { kind: string; day: string; data: unknown }) => ({ kind: r.kind, day: r.day, data: typeof r.data === "string" ? JSON.parse(r.data) : r.data })));
});
app.put("/api/log", async (c) => {
  const b = (await c.req.json()) as { kind?: string; day?: string; data?: unknown };
  if (!b.kind || !LOG_KINDS.has(b.kind) || !b.day || !/^\d{4}-\d{2}-\d{2}$/.test(b.day)) throw new HttpError(400, "Bad entry");
  const json = JSON.stringify(b.data ?? {});
  if (json.length > 4000) throw new HttpError(400, "Too long");
  await sql`insert into "MemberLog" (id, "userId", kind, day, data) values (${randomUUID()}, ${c.get("user").id}, ${b.kind}, ${b.day}::date, ${json}::jsonb)
            on conflict ("userId", kind, day) do update set data = excluded.data, "updatedAt" = now()`;
  return c.json({ ok: true });
});

// Practice tab: graded reps (coaches see a summary) + the member's progress state (XP, streak, review queue).
const PRACTICE_MODEL_SET = new Set<string>(PRACTICE_MODELS);
app.get("/api/practice", async (c) => {
  const uid = c.get("user").id;
  const [[st], reps] = await Promise.all([
    sql`select state from "PracticeState" where "userId" = ${uid}`,
    sql`select model, drill, ok, tags, "createdAt" from "PracticeRep" where "userId" = ${uid} and "createdAt" > now() - interval '120 days' order by "createdAt" desc limit 1500`,
  ]);
  const state = st ? (typeof st.state === "string" ? JSON.parse(st.state) : st.state) : null;
  return c.json({ state, reps: (reps as { model: string; drill: string; ok: boolean; tags: string[]; createdAt: Date }[]).reverse().map((r) => ({ t: new Date(r.createdAt).getTime(), m: r.model, d: r.drill, ok: r.ok, tags: r.tags ?? [] })) });
});
app.post("/api/practice/rep", async (c) => {
  const b = (await c.req.json()) as { m?: string; d?: string; ok?: boolean; tags?: unknown; xp?: number };
  if (!b.m || !PRACTICE_MODEL_SET.has(b.m) || !b.d || !/^[a-z]{2,20}$/.test(b.d) || typeof b.ok !== "boolean") throw new HttpError(400, "Bad rep");
  const tags = Array.isArray(b.tags) ? b.tags.filter((t): t is string => typeof t === "string" && /^[a-z0-9-]{2,30}$/.test(t)).slice(0, 6) : [];
  const xp = Math.max(0, Math.min(200, Math.round(Number(b.xp) || 0)));
  await sql`insert into "PracticeRep" (id, "userId", model, drill, ok, tags, xp) values (${randomUUID()}, ${c.get("user").id}, ${b.m}, ${b.d}, ${b.ok}, ${pgArray(tags)}::text[], ${xp})`;
  return c.json({ ok: true });
});
app.put("/api/practice/state", async (c) => {
  const json = JSON.stringify((await c.req.json()) ?? {});
  if (json.length > 8000) throw new HttpError(400, "Too long");
  await sql`insert into "PracticeState" ("userId", state) values (${c.get("user").id}, ${json}::jsonb)
            on conflict ("userId") do update set state = excluded.state, "updatedAt" = now()`;
  return c.json({ ok: true });
});


// Trading School: progress synced from the school page, exam attempts, coach unlocks.
// The page saves under `v2`; the Classic school (earlier page) saves ch / dives / ck / ex. Each save only sends its own keys and they are merged.
const SCHOOL_MODULE_SET = new Set(SCHOOL_MODULE_IDS);
const ID_RE = /^[a-z0-9-]{1,20}$/;
const clampInt = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
function cleanSchoolState(b: unknown): SchoolState {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const out: SchoolState = {};
  if (o.v2 && typeof o.v2 === "object") {
    const m: Record<string, ModuleProgress> = {};
    for (const [k, v] of Object.entries(((o.v2 as Record<string, unknown>).m && typeof (o.v2 as Record<string, unknown>).m === "object" ? (o.v2 as Record<string, unknown>).m : {}) as Record<string, Record<string, unknown>>).slice(0, 40)) {
      if (!SCHOOL_MODULE_SET.has(k) || !v || typeof v !== "object") continue;
      const s = String(v.s ?? "000");
      m[k] = { s: /^[01]{3,4}$/.test(s) ? s.slice(0, 3) : "000", p: v.p ? 1 : 0, sc: clampInt(v.sc, 0, 100), a: clampInt(v.a, 1, 999), n: clampInt(v.n, 0, 999), at: Math.max(0, Number(v.at) || 0) };
    }
    out.v2 = { m };
  }
  if (Array.isArray(o.ch)) out.ch = o.ch.filter((x): x is string => typeof x === "string" && ID_RE.test(x)).slice(0, 60);
  if (o.dives && typeof o.dives === "object") {
    const dives: Record<string, Record<string, number>> = {};
    for (const [k, v] of Object.entries(o.dives as Record<string, unknown>).slice(0, 60)) {
      if (!ID_RE.test(k) || !v || typeof v !== "object") continue;
      dives[k] = Object.fromEntries(Object.keys(v).filter((x) => ID_RE.test(x)).slice(0, 30).map((x) => [x, 1]));
    }
    out.dives = dives;
  }
  const best = (m: unknown) => {
    const res: Record<string, { best: number; pass: boolean; n: number; at: number }> = {};
    for (const [k, v] of Object.entries((m && typeof m === "object" ? m : {}) as Record<string, Record<string, unknown>>).slice(0, 40)) {
      if (!ID_RE.test(k) || !v || typeof v !== "object") continue;
      res[k] = { best: Math.max(0, Math.min(1, Number(v.best) || 0)), pass: v.pass === true, n: Math.max(0, Math.min(10000, Math.round(Number(v.n) || 0))), at: Math.max(0, Number(v.at) || 0) };
    }
    return res;
  };
  if (o.ck && typeof o.ck === "object") out.ck = best(o.ck);
  if (o.ex && typeof o.ex === "object") out.ex = best(o.ex);
  return out;
}
app.get("/api/school", async (c) => {
  const u = c.get("user");
  const [[row], [pace], [acct]] = await Promise.all([
    sql`select state, unlocks from "SchoolProgress" where "userId" = ${u.id}`,
    sql`select "perWeek", preset, baseline, "startedAt", emails from "SchoolPace" where "userId" = ${u.id}`,
    sql`select email from "LocalAccount" where "userId" = ${u.id} and email is not null and not disabled`,
  ]);
  return c.json({
    state: row ? (typeof row.state === "string" ? JSON.parse(row.state) : row.state) : null, unlocks: isStaff(u) ? ["all"] : row?.unlocks ?? [], staff: isStaff(u), name: u.globalName ?? u.username,
    pace: pace ? { perWeek: Number(pace.perWeek), preset: pace.preset, baseline: pace.baseline, startedAt: new Date(pace.startedAt).toISOString(), emails: pace.emails } : null,
    hasEmail: !!acct,
  });
});
app.put("/api/school", async (c) => {
  const clean = cleanSchoolState(await c.req.json());
  // A module only counts as passed on the server if a passing exam attempt was logged for it.
  const mods = clean.v2?.m;
  if (mods && Object.values(mods).some((x) => x.p === 1)) {
    const rows = (await sql`select distinct ref from "SchoolAttempt" where "userId" = ${c.get("user").id} and kind = 'ex' and pass = true`) as { ref: string }[];
    const passed = new Set(rows.map((r) => r.ref));
    for (const [id, x] of Object.entries(mods)) if (x.p === 1 && !passed.has(id)) { x.p = 0; x.sc = 0; }
  }
  const json = JSON.stringify(clean);
  if (json.length > 20000) throw new HttpError(400, "Too long");
  await sql`insert into "SchoolProgress" ("userId", state) values (${c.get("user").id}, ${json}::jsonb)
            on conflict ("userId") do update set state = coalesce("SchoolProgress".state, '{}'::jsonb) || excluded.state, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.post("/api/school/attempt", async (c) => {
  const b = (await c.req.json()) as { kind?: string; ref?: string; score?: number; total?: number; pass?: boolean };
  const score = Math.round(Number(b.score)), total = Math.round(Number(b.total));
  if ((b.kind !== "ck" && b.kind !== "ex") || !b.ref || !ID_RE.test(b.ref) || !(total > 0 && total <= 50) || !(score >= 0 && score <= total) || typeof b.pass !== "boolean")
    throw new HttpError(400, "Bad attempt");
  if (b.kind === "ex" && b.pass && SCHOOL_MODULE_SET.has(b.ref) && score < Math.ceil(total * 0.8 - 1e-9)) throw new HttpError(400, "Bad attempt");
  await sql`insert into "SchoolAttempt" (id, "userId", kind, ref, score, total, pass) values (${randomUUID()}, ${c.get("user").id}, ${b.kind}, ${b.ref}, ${score}, ${total}, ${b.pass})`;
  return c.json({ ok: true });
});

// ── Trading School pace: chosen modules a week, on/behind status, reminder emails ──
const passedIn = (state: unknown): number => {
  const st = state ? (typeof state === "string" ? JSON.parse(state) : state) as SchoolState : null;
  return Object.entries(st?.v2?.m ?? {}).filter(([k, v]) => SCHOOL_MODULE_SET.has(k) && (v as { p?: number })?.p === 1).length;
};
const paceOut = (p: Record<string, unknown>) => ({ perWeek: Number(p.perWeek), preset: p.preset ?? null, baseline: p.baseline as number, startedAt: new Date(p.startedAt as string).toISOString(), emails: !!p.emails });
app.put("/api/school/pace", async (c) => {
  const u = c.get("user"), b = (await c.req.json().catch(() => ({}))) as { perWeek?: unknown; preset?: unknown; emails?: unknown };
  const [old] = await sql`select "perWeek" from "SchoolPace" where "userId" = ${u.id}`;
  if (b.perWeek == null && !old) throw new HttpError(400, "Pick a pace");
  const perWeek = b.perWeek == null ? Number(old.perWeek) : clampPace(b.perWeek);
  const preset = typeof b.preset === "string" && /^[a-z]{3,10}$/.test(b.preset) ? b.preset : "custom";
  const emails = b.emails !== false;
  const [sp] = await sql`select state from "SchoolProgress" where "userId" = ${u.id}`;
  const baseline = passedIn(sp?.state);
  const [row] = !old || Number(old.perWeek) !== perWeek
    ? await sql`insert into "SchoolPace" ("userId", "perWeek", preset, baseline, emails) values (${u.id}, ${perWeek}, ${preset}, ${baseline}, ${emails})
        on conflict ("userId") do update set "perWeek" = excluded."perWeek", preset = excluded.preset, baseline = excluded.baseline, "startedAt" = now(), "setAt" = now(), changes = "SchoolPace".changes + 1, emails = excluded.emails, "nudgeStreak" = 0
        returning "perWeek", preset, baseline, "startedAt", emails`
    : await sql`update "SchoolPace" set emails = ${emails} where "userId" = ${u.id} returning "perWeek", preset, baseline, "startedAt", emails`;
  return c.json({ pace: paceOut(row) });
});
const unsubSig = (id: string) => createHmac("sha256", CFG.sessionSecret).update("pace-unsub:" + id).digest("hex").slice(0, 32);
app.get("/unsub/pace", async (c) => {
  const id = c.req.query("u") ?? "", t = c.req.query("t") ?? "";
  if (!id || t !== unsubSig(id)) return c.html(pageShell("<h1>That link did not work</h1><p>You can turn reminders off any time from “Your pace” inside the Trading School.</p>"), 400);
  await sql`update "SchoolPace" set emails = false where "userId" = ${id}`;
  return c.html(pageShell("<h1>Reminders are off</h1><p>You will not get pace reminder emails any more. You can turn them back on from “Your pace” in the Trading School.</p><p><a href=\"/school\" style=\"color:#8cc4ff\">Back to the school</a></p>"));
});
app.get("/api/coach/pace", async (c) => {
  staffOnly(c);
  const total = SCHOOL_MODULES.length, now = new Date();
  const rows = await sql`select u.id, coalesce(u."globalName", u.username) as name, p."perWeek", p.preset, p.baseline, p."startedAt", p."setAt", p.changes, p.emails, p."lastNudgeAt", p."nudgeCount",
      sp.state, sp."updatedAt" as active, (a.email is not null and not a.disabled) as "hasEmail"
    from "SchoolPace" p join "User" u on u.id = p."userId" left join "SchoolProgress" sp on sp."userId" = u.id left join "LocalAccount" a on a."userId" = u.id order by p."setAt" desc limit 500`;
  const [{ n: unset }] = await sql`select count(*)::int as n from "SchoolProgress" sp join "User" u on u.id = sp."userId" where u."isGuildMember" and not exists (select 1 from "SchoolPace" p where p."userId" = sp."userId")`;
  const out = rows.map((r: Record<string, any>) => {
    const passed = passedIn(r.state), perWeek = Number(r.perWeek), exp = expectedPassed(r.baseline, perWeek, new Date(r.startedAt), now, total);
    const left = total - passed, fin = passed >= total ? null : new Date(now.getTime() + (left / perWeek) * 7 * 86400_000).toISOString();
    const act = r.active ? new Date(r.active).toISOString() : null;
    return { id: r.id, name: r.name, perWeek, preset: r.preset, passed, total, expected: exp, status: paceStatus(passed, exp, total), finish: fin, lastActive: act, setAt: new Date(r.setAt).toISOString(), changes: r.changes,
      emails: !!r.emails, hasEmail: !!r.hasEmail, nudges: r.nudgeCount, lastNudgeAt: r.lastNudgeAt ? new Date(r.lastNudgeAt).toISOString() : null };
  });
  return c.json({ rows: out, unset });
});
app.post("/api/coach/pace/:id", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), b = (await c.req.json().catch(() => ({}))) as { perWeek?: unknown; reset?: boolean };
  if (b.reset) { await sql`delete from "SchoolPace" where "userId" = ${id}`; return c.json({ ok: true }); }
  const perWeek = clampPace(b.perWeek), [sp] = await sql`select state from "SchoolProgress" where "userId" = ${id}`;
  const [row] = await sql`update "SchoolPace" set "perWeek" = ${perWeek}, preset = 'custom', baseline = ${passedIn(sp?.state)}, "startedAt" = now(), "setAt" = now(), changes = changes + 1, "nudgeStreak" = 0 where "userId" = ${id} returning "userId"`;
  if (!row) throw new HttpError(404, "This member has not set a pace yet");
  return c.json({ ok: true });
});

// Reminder emails: a short nudge when someone has gone quiet for about one study gap at their pace and is not ahead of it.
const NUDGE_FROM_UTC = 14, NUDGE_TO_UTC = 23; // 10am to 7pm Eastern
const firstName = (n: string) => (n.trim().split(/\s+/)[0] || "there").replace(/[<>&"]/g, "");
const nudgeHtml = (name: string, passed: number, total: number, next: { n: number; title: string }, behind: boolean, perWeek: number, unsub: string) =>
  `<div style="font-family:Arial,sans-serif;background:#030405;color:#e6ebf2;padding:32px"><div style="max-width:480px;margin:auto"><div style="font-weight:900;font-size:22px;letter-spacing:.02em"><span style="color:#ff6a00">F</span>LOWHUB</div><h2 style="margin:24px 0 8px">Next up, ${firstName(name)}: Module ${next.n}</h2><p style="color:#929fb2;line-height:1.6;margin:0 0 6px"><b style="color:#e6ebf2">${next.title.replace(/[<>&"]/g, "")}</b></p><p style="color:#929fb2;line-height:1.6">You have passed ${passed} of ${total} modules.${behind ? ` You set a pace of ${perWeek} a week, and one short session gets you back on it.` : " One short session keeps your streak going."}</p><p style="margin:24px 0"><a href="${baseUrl()}/school" style="background:#ff6a00;color:#160a00;font-weight:700;padding:12px 20px;text-decoration:none;border-radius:8px">Continue the school</a></p><p style="color:#66717f;font-size:12px">Too many emails? <a href="${unsub}" style="color:#8cc4ff">Turn reminders off</a>. You can change your pace any time inside the school.</p></div></div>`;
async function runPaceNudges(now = new Date()): Promise<number> {
  const h = now.getUTCHours();
  if (h < NUDGE_FROM_UTC || h >= NUDGE_TO_UTC || !process.env.RESEND_API_KEY) return 0;
  const rows = await sql`select p."userId", p."perWeek", p.baseline, p."startedAt", p."lastNudgeAt", p."nudgeStreak", u."globalName" as name, a.email, sp.state, sp."updatedAt" as active
    from "SchoolPace" p join "User" u on u.id = p."userId" join "LocalAccount" a on a."userId" = p."userId" and a.email is not null and not a.disabled and (a."expiresAt" is null or a."expiresAt" > now())
    left join "SchoolProgress" sp on sp."userId" = p."userId" where p.emails and u.role = 'MEMBER'::"Role" limit 1000`;
  const total = SCHOOL_MODULES.length;
  let sent = 0;
  for (const r of rows as Record<string, any>[]) {
    const passed = passedIn(r.state);
    if (passed >= total) continue;
    const perWeek = Number(r.perWeek), exp = expectedPassed(r.baseline, perWeek, new Date(r.startedAt), now, total);
    if (paceStatus(passed, exp, total) === "ahead") continue;
    const act = r.active ? new Date(r.active) : null, last = r.lastNudgeAt ? new Date(r.lastNudgeAt) : null;
    const streak = act && last && act > last ? 0 : r.nudgeStreak;           // they came back since the last email
    if (streak >= PACE_MAX_NUDGES) continue;
    const quietSince = Math.max(new Date(r.startedAt).getTime(), act?.getTime() ?? 0, last?.getTime() ?? 0);
    if (now.getTime() - quietSince < nudgeGapDays(perWeek) * 86400_000) continue;
    const [claim] = await sql`update "SchoolPace" set "lastNudgeAt" = now(), "nudgeCount" = "nudgeCount" + 1, "nudgeStreak" = ${streak + 1}
      where "userId" = ${r.userId} and ("lastNudgeAt" is null or "lastNudgeAt" < now() - interval '20 hours') returning "userId"`;
    if (!claim) continue;
    const st = r.state ? (typeof r.state === "string" ? JSON.parse(r.state) : r.state) as SchoolState : null;
    const nextDef = SCHOOL_MODULES.find((d) => (st?.v2?.m?.[d.id] as { p?: number } | undefined)?.p !== 1) ?? SCHOOL_MODULES[0];
    const behind = paceStatus(passed, exp, total) === "behind";
    const unsub = `${baseUrl()}/unsub/pace?u=${encodeURIComponent(r.userId)}&t=${unsubSig(r.userId)}`;
    const ok = await sendMail(r.email, `Next up in the Trading School: ${nextDef.title}`, nudgeHtml(r.name ?? "", passed, total, { n: nextDef.n, title: nextDef.title }, behind, perWeek, unsub));
    if (ok) sent++; else await sql`update "SchoolPace" set "nudgeCount" = greatest("nudgeCount" - 1, 0), "nudgeStreak" = ${streak}, "lastNudgeAt" = ${last} where "userId" = ${r.userId}`;
  }
  return sent;
}
setTimeout(() => runPaceNudges().catch((e) => console.error("pace nudges", e)), 120_000);
setInterval(() => runPaceNudges().catch((e) => console.error("pace nudges", e)), 3600_000);

// Trading plan (Trading Plan → Build your plan)
app.get("/api/plan", async (c) => {
  const [row] = await sql`select plan, "updatedAt" from "TradingPlan" where "userId" = ${c.get("user").id}`;
  const plan = row ? { ...(typeof row.plan === "string" ? JSON.parse(row.plan) : row.plan), models: cleanPlanModels((typeof row.plan === "string" ? JSON.parse(row.plan) : row.plan).models), done: true, updatedAt: new Date(row.updatedAt).toISOString() } : null;
  return c.json({ plan });
});
app.put("/api/plan", async (c) => {
  const p = tradingPlanInput.parse(await c.req.json());
  await sql`insert into "TradingPlan" ("userId", plan) values (${c.get("user").id}, ${JSON.stringify(p)}::jsonb)
            on conflict ("userId") do update set plan = excluded.plan, "updatedAt" = now()`;
  return c.json({ ok: true });
});

// Projection (multi-account income plan) — one per member, it becomes their trading plan
app.put("/api/projection", async (c) => {
  const u = c.get("user");
  const { name, ...config } = projectionInput.parse(await c.req.json());
  const ids = [...new Set(config.rows.map((r) => r.templateId))];
  const found = await sql`select id from "AccountTemplate" where id = any(${pgArray(ids)}::text[]) and "isActive"`;
  if (found.length !== ids.length) throw new HttpError(400, "Unknown account");
  await sql`insert into "Projection" (id, "userId", name, config) values (${randomUUID()}, ${u.id}, ${name}, ${JSON.stringify(config)}::jsonb)
            on conflict ("userId") do update set name = excluded.name, config = excluded.config, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.delete("/api/projection", async (c) => {
  await sql`delete from "Projection" where "userId" = ${c.get("user").id}`;
  return c.json({ ok: true });
});

app.post("/api/feedback/:id/read", async (c) => {
  const r = await sql`update "CoachFeedback" set "readAt" = now() where id = ${c.req.param("id")} and "traderId" = ${c.get("user").id} returning id`;
  if (!r.length) throw new HttpError(404, "Not found");
  return c.json({ ok: true });
});

// Usage tracking: the dashboard, school and practice pages send a small heartbeat (seconds spent in a section); coaches read it back.
const USAGE_AREAS = new Set(["dashboard", "school", "practice", "vault"]);
app.post("/api/usage", async (c) => {
  const b = (await c.req.json().catch(() => ({}))) as { sid?: string; area?: string; section?: string; secs?: number };
  if (!b.sid || !/^[A-Za-z0-9-]{8,48}$/.test(b.sid) || !b.area || !USAGE_AREAS.has(b.area)) throw new HttpError(400, "Bad usage ping");
  const section = String(b.section ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80) || "Other";
  const secs = clampInt(b.secs, 0, 120);
  const uid = c.get("user").id;
  await sql`insert into "UsageSession" (id, "userId", seconds) values (${b.sid}, ${uid}, ${secs})
            on conflict (id) do update set "lastSeenAt" = now(), seconds = "UsageSession".seconds + ${secs} where "UsageSession"."userId" = ${uid}`;
  if (secs > 0)
    await sql`insert into "UsageDaily" ("userId", day, area, section, seconds) values (${uid}, (now() at time zone 'America/New_York')::date, ${b.area}, ${section}, ${secs})
              on conflict ("userId", day, area, section) do update set seconds = "UsageDaily".seconds + ${secs}, "updatedAt" = now()`;
  return c.json({ ok: true });
});
app.get("/api/coach/usage", async (c) => {
  staffOnly(c);
  const rows = await sql`
    select u.id, coalesce(u."globalName", u.username) as name, u.role, u."lastLoginAt",
           max(s."lastSeenAt") as "lastSeen",
           count(s.id) filter (where s."startedAt" > now() - interval '7 days')::int as sessions7,
           coalesce(sum(s.seconds) filter (where s."startedAt" > now() - interval '7 days'), 0)::int as secs7
    from "User" u left join "UsageSession" s on s."userId" = u.id
    where u."isGuildMember" or exists (select 1 from "UsageSession" x where x."userId" = u.id)
    group by u.id order by max(s."lastSeenAt") desc nulls last, u.username limit 500`;
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  return c.json(rows.map((r: Record<string, unknown>) => ({ id: r.id, name: r.name, role: r.role, lastSeen: iso(r.lastSeen), lastLogin: iso(r.lastLoginAt), sessions7: r.sessions7, minutes7: Math.round(Number(r.secs7) / 60) })));
});
app.get("/api/coach/usage/:id", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), days = clampInt(c.req.query("days") ?? 30, 1, 120);
  const [sessions, sections] = await Promise.all([
    sql`select "startedAt", "lastSeenAt", seconds from "UsageSession" where "userId" = ${id} order by "startedAt" desc limit 25`,
    sql`select area, section, sum(seconds)::int as seconds, max(day) as "lastDay" from "UsageDaily" where "userId" = ${id} and day > (now() at time zone 'America/New_York')::date - ${days}::int group by area, section order by sum(seconds) desc limit 200`,
  ]);
  const iso = (v: unknown) => new Date(v as string).toISOString();
  return c.json({
    days,
    sessions: sessions.map((s: Record<string, unknown>) => ({ startedAt: iso(s.startedAt), lastSeenAt: iso(s.lastSeenAt), minutes: Math.round(Number(s.seconds) / 60) })),
    sections: sections.map((s: Record<string, unknown>) => ({ area: s.area, section: s.section, minutes: Math.round((Number(s.seconds) / 60) * 10) / 10, lastDay: String(s.lastDay).slice(0, 10) })),
  });
});

// ─────────────────────────────────────────────────────────────
// The ECHO X ORBIT vault: its own page, served only to members Hannah approved (mentorship role + a code she issued).
// The lessons never reach the browser of anyone else: they are not in the school page, the practice page or any public asset.
// ─────────────────────────────────────────────────────────────
const rolesOf = (u: { guildRoleIds?: unknown }): string[] => {
  const gr = u.guildRoleIds;
  return Array.isArray(gr) ? gr.map(String) : typeof gr === "string" ? gr.replace(/[{}"]/g, "").split(",").filter(Boolean) : [];
};
const hasMentorRole = (u: { guildRoleIds?: unknown }) => rolesOf(u).some((id) => CFG.mentorshipRoles.includes(id) || /mentor/i.test(ROLE_NAMES.get(id) ?? ""));
type VaultRow = { userId: string; codeHash: string; codeHint: string; redeemedAt: Date | null; revokedAt: Date | null; mentorshipOverride: boolean; orderflow: boolean };
type VaultAccess = { level: "open" | "code" | "none"; orderflow: boolean; row: VaultRow | null };
async function vaultAccess(u: UserRow): Promise<VaultAccess> {
  if (isStaff(u)) return { level: "open", orderflow: u.role === "ADMIN", row: null }; // staff can look around; only an admin sees the sealed room
  const [row] = (await sql`select * from "VaultAccess" where "userId" = ${u.id}`) as VaultRow[];
  if (!row || row.revokedAt || !(hasMentorRole(u) || row.mentorshipOverride)) return { level: "none", orderflow: false, row: row ?? null };
  if (!row.redeemedAt) return { level: "code", orderflow: false, row };
  return { level: "open", orderflow: !!row.orderflow, row };
}
const readPrivate = async (name: string) => {
  const f = Bun.file(`${import.meta.dir}/assets/${name}`);
  return (await f.exists()) ? new Uint8Array(await f.arrayBuffer()) : null;
};
let vaultHtml: { etag: string; html: string } | null = null;
const tries = new Map<string, { n: number; reset: number }>();
const LOCK_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>The Vault · FLOWHUB</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 38%,#0f141b 0,#05070a 58%,#020304 100%);color:#e6ebf2;font:15px/1.5 Inter,system-ui,sans-serif;overflow:hidden}
a{color:#8cc4ff}.back{position:fixed;top:18px;left:20px;font-size:13px;text-decoration:none;color:#929fb2}
.wrap{text-align:center;padding:24px;max-width:460px}
.door{position:relative;width:224px;height:224px;margin:0 auto 26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#232b36,#10151c 60%,#0a0d12);box-shadow:0 0 0 2px #28313e,0 0 0 10px #0b0f14,0 0 0 11px #28313e,0 24px 60px rgba(0,0,0,.7);transition:transform 1.1s cubic-bezier(.6,0,.2,1),opacity .9s}
.door:before{content:"";position:absolute;inset:22px;border-radius:50%;border:2px dashed #2f3a48}
.door:after{content:"";position:absolute;inset:60px;border-radius:50%;background:#0a0d12;box-shadow:inset 0 0 0 2px #28313e}
.bolts i{position:absolute;width:10px;height:10px;border-radius:50%;background:#394555;left:107px;top:7px;transform-origin:5px 105px}
.dial{position:absolute;z-index:2;inset:74px;border-radius:50%;border:2px solid #ff6a00;transition:transform 1.1s cubic-bezier(.6,0,.2,1)}
.dial:before{content:"";position:absolute;left:50%;top:-8px;width:3px;height:16px;margin-left:-1.5px;background:#ff6a00}
.open .dial{transform:rotate(720deg)}.open .door{transform:scale(1.6);opacity:0}
h1{font:900 26px Archivo,Arial Black,sans-serif;letter-spacing:.02em;margin:0 0 8px}p{color:#929fb2;margin:0 0 20px}
form{display:flex;gap:8px;justify-content:center}input{width:210px;background:#0a0d12;border:1px solid #28313e;color:#e6ebf2;border-radius:3px;padding:11px 12px;font:500 16px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;text-align:center}
input:focus{outline:2px solid #ff6a00;outline-offset:1px}button{background:#ff6a00;color:#fff;border:0;border-radius:3px;padding:11px 18px;font:600 14px Inter,sans-serif;cursor:pointer}button:disabled{opacity:.5}
.msg{min-height:22px;margin-top:14px;font-size:14px;color:#ff5d73}.fine{margin-top:26px;font-size:12.5px;color:#66717f}
</style></head><body><a class="back" href="/">← FLOWHUB home</a>
<div class="wrap" id="w"><div class="door" aria-hidden="true"><span class="bolts"><i style="transform:rotate(0)"></i><i style="transform:rotate(45deg)"></i><i style="transform:rotate(90deg)"></i><i style="transform:rotate(135deg)"></i><i style="transform:rotate(180deg)"></i><i style="transform:rotate(225deg)"></i><i style="transform:rotate(270deg)"></i><i style="transform:rotate(315deg)"></i></span><div class="dial"></div></div>
<h1>ECHO X ORBIT</h1><p>The vault is by invitation: mentorship members only. Enter the code Hannah gave you.</p>
<form id="f"><input id="c" placeholder="FH-XXXXX-XXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="16" aria-label="Vault code"><button id="b" type="submit">Open</button></form>
<div class="msg" id="m" role="status"></div><p class="fine">No code yet? If you are in mentorship, send Hannah a message on Discord. Everything in the vault stays inside it.</p></div>
<script>
const f=document.getElementById('f'),c=document.getElementById('c'),m=document.getElementById('m'),b=document.getElementById('b'),w=document.getElementById('w');
f.addEventListener('submit',async e=>{e.preventDefault();m.textContent='';b.disabled=true;
 try{const r=await fetch('/api/vault/redeem',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({code:c.value})}),j=await r.json().catch(()=>({}));
  if(r.ok){w.classList.add('open');m.style.color='#3ee0a1';m.textContent='Opening…';setTimeout(()=>location.reload(),1250)}else{m.textContent=j.error||'That code did not work.';b.disabled=false}}
 catch(x){m.textContent='Could not reach FLOWHUB. Try again.';b.disabled=false}});
</script></body></html>`;
app.get("/vault", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.redirect("/");
  const acc = await vaultAccess(user);
  if (acc.level !== "open") return c.html(LOCK_PAGE, 200, { "Cache-Control": "no-store" });
  const gz = await readPrivate("vault.html.gz");
  if (!gz) return c.text("The vault is not installed yet.", 404);
  const etag = String(Bun.hash(gz));
  if (!vaultHtml || vaultHtml.etag !== etag) vaultHtml = { etag, html: gunzipSync(gz).toString("utf8") };
  const nav = `<nav class="fh-nav" aria-label="FLOWHUB"><a href="/#home">← FLOWHUB home</a><a href="/school">Trading School</a></nav>`;
  return c.html(vaultHtml.html.replace("<!--FH_NAV-->", nav), 200, { "Cache-Control": "no-store" });
});
app.post("/api/vault/redeem", async (c) => {
  const u = c.get("user");
  const now = Date.now(), t = tries.get(u.id);
  if (t && t.reset > now && t.n >= 8) throw new HttpError(429, "Too many tries. Wait a few minutes and try again.");
  const bump = () => tries.set(u.id, t && t.reset > now ? { n: t.n + 1, reset: t.reset } : { n: 1, reset: now + 10 * 60 * 1000 });
  const b = (await c.req.json().catch(() => ({}))) as { code?: string };
  const acc = await vaultAccess(u);
  const bad = () => { bump(); return new HttpError(400, "That code did not work."); };
  if (acc.level === "open") return c.json({ ok: true });
  if (acc.level !== "code" || !acc.row || !b.code) throw bad();
  const want = Buffer.from(acc.row.codeHash, "hex"), got = Buffer.from(hashCode(b.code, CFG.sessionSecret), "hex");
  if (want.length !== got.length || !timingSafeEqual(want, got)) throw bad();
  await sql`update "VaultAccess" set "redeemedAt" = now(), "updatedAt" = now() where "userId" = ${u.id}`;
  await audit(u.id, "VAULT_OPEN", u.id);
  tries.delete(u.id);
  return c.json({ ok: true });
});
// what the home screen shows: the open door, the code door (a code was issued), or a dim "restricted" tile
app.get("/api/vault/status", async (c) => {
  const acc = await vaultAccess(c.get("user"));
  return c.json({ status: acc.level === "open" ? "open" : acc.level === "code" ? "code" : "restricted" });
});
app.get("/api/vault/progress", async (c) => {
  const u = c.get("user"), acc = await vaultAccess(u);
  if (acc.level !== "open") throw new HttpError(403, "Not open");
  const [row] = acc.row ? await sql`select state from "VaultAccess" where "userId" = ${u.id}` : [];
  const state = row?.state ? (typeof row.state === "string" ? JSON.parse(row.state) : row.state) : null;
  return c.json({ state, unlocks: [], name: u.globalName ?? u.username, orderflow: acc.orderflow });
});
app.put("/api/vault/progress", async (c) => {
  const u = c.get("user"), acc = await vaultAccess(u);
  if (acc.level !== "open") throw new HttpError(403, "Not open");
  if (!acc.row) return c.json({ ok: true }); // staff preview: nothing is saved
  const set = new Set(VAULT_MODULE_IDS), o = (await c.req.json().catch(() => ({}))) as { v2?: { m?: Record<string, Record<string, unknown>> } };
  const m: Record<string, ModuleProgress> = {};
  for (const [k, v] of Object.entries(o.v2?.m ?? {}).slice(0, 30)) {
    if (!set.has(k) || !v || typeof v !== "object") continue;
    const s = String(v.s ?? "000");
    m[k] = { s: /^[01]{3,4}$/.test(s) ? s.slice(0, 3) : "000", p: v.p ? 1 : 0, sc: clampInt(v.sc, 0, 100), a: clampInt(v.a, 1, 999), n: clampInt(v.n, 0, 999), at: Math.max(0, Number(v.at) || 0) };
  }
  await sql`update "VaultAccess" set state = ${JSON.stringify({ v2: { m } })}::jsonb, "updatedAt" = now() where "userId" = ${u.id}`;
  return c.json({ ok: true });
});
// the sealed Orderflow room's lessons: sent only to a member with the separate orderflow approval
app.get("/api/vault/orderflow.js", async (c) => {
  const acc = await vaultAccess(c.get("user"));
  if (acc.level !== "open" || !acc.orderflow) return c.text("", 403);
  const gz = await readPrivate("vault-orderflow.js.gz");
  if (!gz) return c.text("", 404);
  return c.body(gz as unknown as ArrayBuffer, 200, { "Content-Type": "text/javascript; charset=utf-8", "Content-Encoding": "gzip", "Cache-Control": "no-store" });
});

// Coach / Admin
app.get("/api/coach/members", async (c) => {
  staffOnly(c);
  const q = (c.req.query("q") ?? "").slice(0, 50);
  const sortQ = c.req.query("sort");
  const sort: DirectorySort = sortQ === "recent" || sortQ === "consistency" ? sortQ : "drawdown";
  const like = `%${q}%`;
  const members = await sql`select id from "User" where "isGuildMember" and (${q} = '' or username ilike ${like} or "globalName" ilike ${like}) limit 500`;
  const rows = [];
  for (const m of members) rows.push(buildDirectoryRow(await loadDashboard(c.get("user"), m.id)));
  return c.json(sortDirectory(rows, sort));
});
app.get("/api/coach/members/:id", async (c) => {
  staffOnly(c);
  const d = await loadDashboard(c.get("user"), c.req.param("id"));
  await audit(c.get("user").id, "VIEW_MEMBER", c.req.param("id"));
  return c.json(d);
});
app.post("/api/coach/members/:id/unlock", async (c) => {
  staffOnly(c);
  const b = (await c.req.json()) as { level?: string; on?: boolean };
  if (!b.level || !SCHOOL_MODULE_SET.has(b.level) || typeof b.on !== "boolean") throw new HttpError(400, "Bad module");
  const id = c.req.param("id");
  if (!(await sql`select 1 from "User" where id = ${id}`).length) throw new HttpError(404, "Not found");
  if (b.on)
    await sql`insert into "SchoolProgress" ("userId", unlocks) values (${id}, ${pgArray([b.level])}::text[])
              on conflict ("userId") do update set unlocks = array(select distinct unnest("SchoolProgress".unlocks || ${pgArray([b.level])}::text[])), "updatedAt" = now()`;
  else await sql`update "SchoolProgress" set unlocks = array_remove(unlocks, ${b.level}), "updatedAt" = now() where "userId" = ${id}`;
  await audit(c.get("user").id, b.on ? "SCHOOL_UNLOCK" : "SCHOOL_RELOCK", id, { level: b.level });
  return c.json({ ok: true });
});
// Vault access, from the coach portal
app.get("/api/coach/vault", async (c) => {
  staffOnly(c);
  const rows = await sql`select u.id, coalesce(u."globalName", u.username) as name, u.role, u."guildRoleIds", v."codeHint", v."issuedAt", v."redeemedAt", v."revokedAt", v."mentorshipOverride", v.orderflow, v.state
    from "User" u left join "VaultAccess" v on v."userId" = u.id
    where u."isGuildMember" or v."userId" is not null order by (v."userId" is null), v."issuedAt" desc nulls last, u.username limit 500`;
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  return c.json(rows.map((r: Record<string, unknown>) => ({
    id: r.id, name: r.name, role: r.role, mentorship: hasMentorRole(r as { guildRoleIds?: unknown }), override: !!r.mentorshipOverride,
    code: r.issuedAt ? (r.revokedAt ? "revoked" : r.redeemedAt ? "opened" : "issued") : "none", hint: r.codeHint ?? null, issuedAt: iso(r.issuedAt), redeemedAt: iso(r.redeemedAt),
    orderflow: !!r.orderflow, passed: vaultPassed(r.state ? (typeof r.state === "string" ? JSON.parse(r.state) : r.state) : null),
  })));
});
app.post("/api/coach/vault/:id/code", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), b = (await c.req.json().catch(() => ({}))) as { mentorship?: boolean };
  const [t] = await sql`select id, "guildRoleIds" from "User" where id = ${id}`;
  if (!t) throw new HttpError(404, "Not found");
  const role = hasMentorRole(t as { guildRoleIds?: unknown }), override = !role && b.mentorship === true;
  if (!role && !override) throw new HttpError(400, "This member does not have the mentorship role. Tick \"Mark as mentorship\" to confirm they are in mentorship.");
  const code = makeCode(randomBytes(10));
  await sql`insert into "VaultAccess" ("userId", "codeHash", "codeHint", "issuedBy", "mentorshipOverride")
            values (${id}, ${hashCode(code, CFG.sessionSecret)}, ${code.slice(-3)}, ${c.get("user").id}, ${override})
            on conflict ("userId") do update set "codeHash" = excluded."codeHash", "codeHint" = excluded."codeHint", "issuedBy" = excluded."issuedBy", "issuedAt" = now(),
              "redeemedAt" = null, "revokedAt" = null, "mentorshipOverride" = "VaultAccess"."mentorshipOverride" or excluded."mentorshipOverride", "updatedAt" = now()`;
  await audit(c.get("user").id, "VAULT_CODE", id);
  return c.json({ code }); // shown once: only the hash is kept
});
app.post("/api/coach/vault/:id/revoke", async (c) => {
  staffOnly(c);
  const r = await sql`update "VaultAccess" set "revokedAt" = now(), "updatedAt" = now() where "userId" = ${c.req.param("id")} returning "userId"`;
  if (!r.length) throw new HttpError(404, "Not found");
  await audit(c.get("user").id, "VAULT_REVOKE", c.req.param("id"));
  return c.json({ ok: true });
});
app.post("/api/coach/vault/:id/orderflow", async (c) => {
  staffOnly(c);
  if (c.get("user").role !== "ADMIN") throw new HttpError(403, "Only an admin can open the Orderflow room");
  const b = (await c.req.json().catch(() => ({}))) as { on?: boolean };
  if (typeof b.on !== "boolean") throw new HttpError(400, "Bad request");
  const r = await sql`update "VaultAccess" set orderflow = ${b.on}, "updatedAt" = now() where "userId" = ${c.req.param("id")} returning "userId"`;
  if (!r.length) throw new HttpError(404, "Issue a vault code first");
  await audit(c.get("user").id, b.on ? "ORDERFLOW_OPEN" : "ORDERFLOW_CLOSE", c.req.param("id"));
  return c.json({ ok: true });
});
app.post("/api/coach/feedback", async (c) => {
  staffOnly(c);
  const d = feedbackInput.parse(await c.req.json());
  if (d.journalEntryId && !(await sql`select 1 from "JournalEntry" where id = ${d.journalEntryId} and "userId" = ${d.traderId}`).length)
    throw new HttpError(400, "Trade doesn't belong to this trader");
  if (d.memberAccountId && !(await sql`select 1 from "MemberAccount" where id = ${d.memberAccountId} and "userId" = ${d.traderId}`).length)
    throw new HttpError(400, "Account doesn't belong to this trader");
  const id = randomUUID();
  await sql`insert into "CoachFeedback" (id, "coachId", "traderId", "journalEntryId", "memberAccountId", kind, body)
            values (${id}, ${c.get("user").id}, ${d.traderId}, ${d.journalEntryId ?? null}, ${d.memberAccountId ?? null}, ${d.kind}::"FeedbackKind", ${d.body})`;
  await audit(c.get("user").id, "FEEDBACK_CREATE", d.traderId, { feedbackId: id });
  return c.json({ id });
});
app.patch("/api/admin/catalog/:id", async (c) => {
  staffOnly(c);
  const d = templatePatch.parse(await c.req.json());
  const [before] = await sql`select * from "AccountTemplate" where id = ${c.req.param("id")}`;
  if (!before) throw new HttpError(404, "Not found");
  await patchRow("AccountTemplate", before.id, { ...d, updatedById: c.get("user").id });
  await sql`update "AccountTemplate" set "lastVerifiedAt" = now() where id = ${before.id}`;
  await audit(c.get("user").id, "CATALOG_UPDATE", before.id, { changes: d });
  return c.json({ ok: true });
});
// Local accounts (coach portal)
const expiryFrom = (days: unknown): Date | null => { if (days === null || days === undefined || days === "") return null; const n = Math.round(Number(days)); if (!(n >= 1 && n <= 3650)) throw new HttpError(400, "Days must be 1–3650, or blank for no limit"); return new Date(Date.now() + n * 86400_000); };
app.get("/api/local-accounts", async (c) => {
  staffOnly(c);
  const rows = await sql`select u.id, a.username, a.email, u."globalName" as name, a.disabled, a."expiresAt", a.days, (a."passwordHash" is not null) as active, u."lastLoginAt", a."createdAt" from "LocalAccount" a join "User" u on u.id = a."userId" order by a."createdAt" desc`;
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  return c.json(rows.map((r: Record<string, unknown>) => ({ ...r, expiresAt: iso(r.expiresAt), lastLoginAt: r.active ? iso(r.lastLoginAt) : null, createdAt: iso(r.createdAt) })));
});
app.post("/api/local-accounts", async (c) => {
  staffOnly(c);
  const b = (await c.req.json()) as { email?: string; name?: string; days?: unknown };
  const email = String(b.email ?? "").trim().toLowerCase(), name = String(b.name ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) throw new HttpError(400, "Enter a valid email address");
  if (name.length < 1 || name.length > 60) throw new HttpError(400, "Enter a name");
  const days = b.days === null || b.days === undefined || b.days === "" ? null : Math.round(Number(b.days));
  if (days !== null && !(days >= 1 && days <= 3650)) throw new HttpError(400, "Days must be 1–3650, or blank for no limit");
  const [dupe] = await sql`select 1 as x from "LocalAccount" where username = ${email} or lower(email) = ${email}`;
  if (dupe) throw new HttpError(409, "That email already has an account");
  const id = randomUUID();
  await sql`insert into "User" (id, "discordId", username, "globalName", role, "guildRoleIds", "isGuildMember", "rolesSyncedAt", "lastLoginAt")
            values (${id}, ${"local:" + email}, ${email}, ${name}, 'MEMBER'::"Role", ${pgArray([])}::text[], true, now(), now())`;
  await sql`insert into "LocalAccount" ("userId", username, email, days, "createdById") values (${id}, ${email}, ${email}, ${days}, ${c.get("user").id})`;
  const m = await inviteMail(id, name, email, "invite");
  return c.json({ id, emailed: m.sent, link: m.sent ? undefined : m.link });
});
app.patch("/api/local-accounts/:id", async (c) => {
  staffOnly(c);
  const id = c.req.param("id"), b = (await c.req.json()) as { disabled?: boolean; days?: unknown; resend?: boolean; name?: string };
  const [a] = await sql`select "userId", email, "passwordHash" from "LocalAccount" where "userId" = ${id}`;
  if (!a) throw new HttpError(404, "Not found");
  if (typeof b.disabled === "boolean") await sql`update "LocalAccount" set disabled = ${b.disabled} where "userId" = ${id}`;
  if ("days" in b) { const d = b.days === null || b.days === "" ? null : Math.round(Number(b.days)); if (d !== null && !(d >= 1 && d <= 3650)) throw new HttpError(400, "Days must be 1–3650, or blank for no limit");
    await sql`update "LocalAccount" set days = ${d}, "expiresAt" = ${a.passwordHash && d ? new Date(Date.now() + d * 86400_000) : null} where "userId" = ${id}`; }
  if (b.name !== undefined && b.name.trim()) await sql`update "User" set "globalName" = ${b.name.trim().slice(0, 60)} where id = ${id}`;
  if (b.resend) {
    if (!a.email) throw new HttpError(400, "This account has no email address");
    const [u] = await sql`select "globalName" as name from "User" where id = ${id}`;
    const m = await inviteMail(id, u.name ?? "", a.email, a.passwordHash ? "reset" : "invite");
    return c.json({ ok: true, emailed: m.sent, link: m.sent ? undefined : m.link });
  }
  return c.json({ ok: true });
});
app.all("/api/*", () => { throw new HttpError(404, "Not found"); });

// ── Static app: gzipped files shipped next to server.js (repo deploys), else the "AppAsset" table ─
const ASSET_TYPES: Record<string, string> = { "app.js": "text/javascript; charset=utf-8", "app.css": "text/css; charset=utf-8", "school.html": "text/html; charset=utf-8", "practice.html": "text/html; charset=utf-8" };
const assetCache = new Map<string, { type: string; body: Uint8Array; etag: string }>();
async function asset(path: string) {
  const hit = assetCache.get(path);
  if (hit) return hit;
  if (ASSET_TYPES[path]) {
    const f = Bun.file(`${import.meta.dir}/assets/${path}.gz`);
    if (await f.exists()) {
      const body = new Uint8Array(await f.arrayBuffer());
      const a = { type: ASSET_TYPES[path], body, etag: `"${Bun.hash(body).toString(36)}"` };
      assetCache.set(path, a);
      return a;
    }
  }
  const [row] = await sql`select "contentType", body, extract(epoch from "updatedAt")::bigint as v from "AppAsset" where path = ${path}`;
  if (!row) return null;
  const a = { type: row.contentType as string, body: Buffer.from(row.body as string, "base64"), etag: `"${row.v}"` };
  assetCache.set(path, a);
  return a;
}
app.get("/assets/:name", async (c) => {
  const a = await asset(c.req.param("name"));
  if (!a) return c.text("Not found", 404);
  if (c.req.header("if-none-match") === a.etag) return c.body(null, 304);
  return c.body(a.body as unknown as ArrayBuffer, 200, {
    "Content-Type": a.type, "Content-Encoding": "gzip", ETag: a.etag, "Cache-Control": "public, max-age=300", Vary: "Accept-Encoding",
  });
});

const SHELL = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>FLOWHUB · FLOWMTD Trading</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#030405">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23030405'/%3E%3Ctext x='16' y='25' font-family='Arial Black,Arial' font-weight='900' font-size='24' text-anchor='middle' fill='%23ff6a00'%3EF%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,700..900;1,100..125,700..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@500;700&family=Rajdhani:wght@500;600;700&display=swap">
<style>:root{color-scheme:dark;--font-archivo:"Archivo";--font-orbitron:"Orbitron";--font-rajdhani:"Rajdhani";--font-inter:"Inter";--font-jetbrains:"JetBrains Mono"}html,body{margin:0;background:#030405;color:#e6ebf2}#boot{font:12px/1.4 monospace;letter-spacing:.2em;color:#58626f;padding:40px 16px;text-align:center}</style>
<link rel="stylesheet" href="/assets/app.css?v=__V__">
</head><body><div id="root"><div id="boot">FLOWHUB // BOOTING</div></div>
<script type="importmap">{"imports":{
  "react":"https://esm.sh/react@19.1.1",
  "react/jsx-runtime":"https://esm.sh/react@19.1.1/jsx-runtime",
  "react-dom":"https://esm.sh/react-dom@19.1.1?deps=react@19.1.1",
  "react-dom/client":"https://esm.sh/react-dom@19.1.1/client?deps=react@19.1.1"
}}</script>
<script type="module" src="/assets/app.js?v=__V__"></script>
</body></html>`;
// Trading School + Practice: their own pages, members only, with the FLOWHUB tabs filled in.
const pageHtml = new Map<string, string>();
const fhNav = (user: UserRow, current: "school" | "practice") =>
  `<nav class="fh-nav" aria-label="FLOWHUB"><a href="/#home">Home</a><a href="/#dashboard">My Dashboard</a><a href="/#plan">Trading Plan</a>` +
  `<a href="/school"${current === "school" ? ' aria-current="page"' : ""}>Trading School</a><a href="/practice"${current === "practice" ? ' aria-current="page"' : ""}>Practice</a>` +
  `${isStaff(user) ? '<a href="/#coach">Coach Portal</a>' : ""}</nav>`;
const PAGES: [asset: string, route: string, current: "school" | "practice"][] = [["school", "/school", "school"], ["practice", "/practice", "practice"]];
for (const [name, route, current] of PAGES) {
  app.get(route, async (c) => {
    const user = await currentUser(c);
    if (!user) return c.redirect("/");
    const a = await asset(`${name}.html`);
    if (!a) return c.text("This page isn't installed yet.", 404);
    const key = `${name}:${a.etag}`;
    if (!pageHtml.has(key)) pageHtml.set(key, gunzipSync(a.body).toString("utf8"));
    return c.html(pageHtml.get(key)!.replace("<!--FH_NAV-->", fhNav(user, current)), 200, { "Cache-Control": "no-cache" });
  });
}

app.get("*", async (c) => {
  const js = await asset("app.js");
  return c.html(SHELL.replaceAll("__V__", js?.etag.replaceAll('"', "") ?? "0"), 200, { "Cache-Control": "no-cache" });
});

export default { port: Number(env.PORT ?? 3000), fetch: app.fetch };
console.log("FLOWHUB up · discord", discordReady() ? "configured" : "NOT configured");
