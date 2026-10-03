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
import { createCipheriv, createDecipheriv, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { buildDashboard, buildDirectoryRow, sortDirectory, type DirectorySort, type RawAccount } from "../src/lib/viewmodel";
import { blendedWinRate, type StrategyKey } from "../src/lib/strategies";
import { accountInput, accountPatch, feedbackInput, journalInput, journalPatch, projectionInput, roadmapSchema, templatePatch } from "../src/lib/validators";
import { todayET, type CatalogFirm, type DashboardData, type PersonDTO, type ProjectionDTO, type RulesDTO } from "../src/lib/types";
import type { Instrument } from "../src/lib/planner";
import { PRACTICE_MODELS, summarizePractice } from "../src/lib/practice";

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
// Log the server's role names → IDs on boot so the operator can map roles without Developer Mode.
if (CFG.botToken && CFG.guildId)
  fetch(`${DISCORD}/guilds/${CFG.guildId}/roles`, { headers: { Authorization: `Bot ${CFG.botToken}` } })
    .then((r) => (r.ok ? r.json() : r.text().then((t) => Promise.reject(`${r.status} ${t}`))))
    .then((roles: { id: string; name: string }[]) => console.log("FLOWHUB roles:", roles.map((x) => `${x.name}=${x.id}`).join(" | ")))
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
  const [[rm], accounts, journal, feedback, [pj], practiceRows] = await Promise.all([
    sql`select * from "Roadmap" where "userId" = ${traderId}`,
    sql`select *, to_char("startDate", 'YYYY-MM-DD') as "startISO" from "MemberAccount" where "userId" = ${traderId} order by "createdAt"`,
    sql`select j.*, to_char(j."tradeDate", 'YYYY-MM-DD') as "dateISO",
               (select count(*)::int from "CoachFeedback" f where f."journalEntryId" = j.id) as "fb"
        from "JournalEntry" j where j."userId" = ${traderId} and j."tradeDate" >= current_date - 400`,
    sql`select f.*, c."globalName" as "cName", c.username as "cUser", c."discordId" as "cDid", c."avatarHash" as "cAv"
        from "CoachFeedback" f join "User" c on c.id = f."coachId" where f."traderId" = ${traderId} order by f."createdAt" desc limit 100`,
    sql`select name, config, "updatedAt" from "Projection" where "userId" = ${traderId}`,
    sql`select model, drill, ok, tags, "createdAt" from "PracticeRep" where "userId" = ${traderId} and "createdAt" > now() - interval '120 days' order by "createdAt"`,
  ]);
  const strategies = (rm?.strategies ?? []) as StrategyKey[];
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
  return c.redirect("/#dashboard");
});

app.get("/auth/logout", (c) => {
  deleteCookie(c, "fh_session", { path: "/" });
  return c.redirect("/");
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,700..900;1,100..125,700..900&family=Orbitron:wght@500;700&family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>:root{color-scheme:dark;--font-archivo:"Archivo";--font-orbitron:"Orbitron";--font-rajdhani:"Rajdhani";--font-jetbrains:"JetBrains Mono"}html,body{margin:0;background:#030405;color:#e6ebf2}#boot{font:12px/1.4 monospace;letter-spacing:.2em;color:#58626f;padding:40px 16px;text-align:center}</style>
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
  `<nav class="fh-nav" aria-label="FLOWHUB"><a href="/#dashboard">My Dashboard</a><a href="/#plan">Projections</a>` +
  `<a href="/school"${current === "school" ? ' aria-current="page"' : ""}>Trading School</a><a href="/practice"${current === "practice" ? ' aria-current="page"' : ""}>Practice</a>` +
  `${isStaff(user) ? '<a href="/#coach">Coach Portal</a>' : ""}</nav>`;
for (const page of ["school", "practice"] as const) {
  app.get(`/${page}`, async (c) => {
    const user = await currentUser(c);
    if (!user) return c.redirect("/");
    const a = await asset(`${page}.html`);
    if (!a) return c.text("This page isn't installed yet.", 404);
    const key = `${page}:${a.etag}`;
    if (!pageHtml.has(key)) pageHtml.set(key, gunzipSync(a.body).toString("utf8"));
    return c.html(pageHtml.get(key)!.replace("<!--FH_NAV-->", fhNav(user, page)), 200, { "Cache-Control": "no-cache" });
  });
}

app.get("*", async (c) => {
  const js = await asset("app.js");
  return c.html(SHELL.replaceAll("__V__", js?.etag.replaceAll('"', "") ?? "0"), 200, { "Cache-Control": "no-cache" });
});

export default { port: Number(env.PORT ?? 3000), fetch: app.fetch };
console.log("FLOWHUB up · discord", discordReady() ? "configured" : "NOT configured");
