# FLOWHUB — by FLOWMTD Trading

Prop firm pass plans, an income roadmap, and a trading journal for our Discord community. Members sign in with Discord. Coaches and admins get a portal where they can view every member's plan and journal and leave feedback.

Theme follows the FLOWMTD brand: black, heavy white type, one orange F.

**Stack:** Next.js 15 (App Router) · Supabase Postgres · Prisma 6 · Auth.js v5 (Discord) · Tailwind CSS v4

---

## Phase 1 — Database (`prisma/schema.prisma`)

| Table | What it holds |
|---|---|
| `User` | Discord ID, username, avatar hash, app role, raw guild role IDs, **encrypted** access/refresh tokens, last role sync |
| `PropFirm` / `AccountTemplate` | The researched catalog: 9 firms, 90 accounts (target, max loss + drawdown model, DLL, consistency %, min days, contract limits, split, source URL, data status). Coaches can edit these rows. |
| `Roadmap` | One per user: monthly take-home income goal, trading days/week, strategy mode (daily levels only / FLOW indicators), multi-session on/off, chosen setups, avg R:R, trades/day, instrument, typical stop. Win rate is **not entered**; it comes from the fixed FLOWMTD win rates in `src/lib/strategies.ts` |
| `MemberAccount` | An exact account the trader holds (links to a template): stage (eval → funded → live), start date, quantity for copy-trading, pass-plan inputs, and a **rule snapshot** taken at purchase so later rule changes don't rewrite history |
| `JournalEntry` | Date, account, ticker, direction, setup, contracts, risk $ / %, planned & realized R, win/loss/BE, net P/L, emotional state, followed-plan flag, screenshot URL, notes |
| `CoachFeedback` | A coach's note on a trade, on an account plan, or general. Has a type (note / praise / warning / action item) and tracks when the trader read it. |
| `Payout` | Payouts received, for income tracking |
| `AuditLog` | Every time a coach views a member, gives feedback, or edits the catalog |

Money is `Decimal(12,2)`. Catalog rule amounts are whole dollars.

## Phase 2 — Auth and role-based access

**Sign-in flow** (`src/auth.ts`)
1. The member clicks **Enter with Discord** and is sent to Discord's OAuth2 page with scopes `identify guilds.members.read`. The app doesn't ask for email.
2. Discord redirects back. Auth.js swaps the code for tokens on the server.
3. **Server check.** The app calls `GET /users/@me/guilds/{GUILD_ID}/member` with the member's token. A 404 means they aren't in our server, so they go to `/not-a-member` and no account is created.
4. **Role mapping.** The member's role IDs are matched against `DISCORD_ADMIN_ROLE_IDS` and `DISCORD_COACH_ROLE_IDS`, giving `ADMIN`, `COACH` or `MEMBER`. Matching uses role **IDs, not names**, so renaming a role or creating a look-alike can't grant access.
5. The user row is upserted. Tokens are encrypted with AES-256-GCM (`src/lib/crypto.ts`) before they are stored and are never sent to the browser.
6. The session is an httpOnly JWT cookie holding only the internal user ID and a role hint.

**Keeping access current** (`src/lib/discord.ts`, `src/lib/rbac.ts`)
- Every server request reads the user's role **from the database**, not from the cookie.
- If the last Discord check is more than 10 minutes old, the app checks again. It uses the server bot when `DISCORD_BOT_TOKEN` is set (recommended), and otherwise the member's refreshed OAuth token.
- A member who leaves or is kicked from the server is locked out within 10 minutes. A coach whose role is removed drops to the member view within 10 minutes.
- During a Discord outage the app keeps the last known role. It never grants a higher role because of an error.

**Member view vs Admin/Coach view**
| | Member | Coach / Admin |
|---|---|---|
| `/dashboard`, own plan and journal | read + write | read + write (their own) |
| Other members' data | ❌ (returns 404, so the app doesn't reveal the data exists) | read-only through `/coach` and `/api/coach/*`, every view audited |
| Coach feedback | read + mark as read | create |
| Catalog rule edits | ❌ | ✅ (`PATCH /api/admin/catalog/:id`) |

- Middleware (`src/middleware.ts`) redirects signed-out users and non-staff away from `/coach`. That's only for navigation. Real enforcement happens in every route handler through `requireUser()`, `requireStaff()` and ownership checks.
- Writes are always scoped to the caller. The `userId` is never read from the request body.
- Every non-GET request is checked for same-origin as CSRF protection. All input is validated with zod (`src/lib/validators.ts`).
- Coaches can't edit or delete member trades. They can only add feedback.

## FLOWMTD strategies (`src/lib/strategies.ts`)

Members pick what they trade instead of typing a win rate:

| Strategy | Session | Win rate |
|---|---|---|
| Daily levels (only) | — | 92% |
| AsiaFlow · PO3 | Asia | 70% |
| AsiaFlow · A3IA | Asia | 81% |
| NYFlow · PO3 | New York | 74.5% |
| NYFlow · H/L | New York | 84% |

- **Only my daily levels** uses 92% and ignores the indicators.
- **FLOW indicators** lets members pick any setups. With **multiple sessions** off, only one indicator's setups can be picked. With it on, Asia and NY can be combined.
- The plan's win rate is the average of the chosen setups. The journal's Strategy field uses the same names, and the income card shows each setup's actual win rate against its fixed rate.


## Projections — multi-account income + trading plan (`src/lib/projection.ts`, `src/components/Projections.tsx`)

The **Projections** tab lets a member lay out any mix of accounts, for example 3× Lucid Flex 50K in evaluation plus 2× Apex 100K funded. Each account type has how many copies, whether it's still in evaluation or already funded, the cost per attempt, the monthly fee and a monthly payout cap.

- **Income projection:** a Monte Carlo simulation (400 runs) using the member's FLOWMTD setups, R:R, trades a day and stop.
  - Every account takes the *same trades* each day, like copy-trading.
  - Each account follows its own rules: daily loss, trailing drawdown and consistency.
  - Evaluations pass or fail. Failed evaluations are re-bought if the member chooses (the cost is counted).
  - Funded accounts are paid at month end: profit above a cushion of one max loss, up to the payout cap. The cap defaults to 6% of account size (for example $3K on a 50K).
  - Output: a bad, typical and good month for each month, the running total, the month the income goal is reached, and each account's pass rate, blow-up risk and payouts.
- **Risk level:** Low (75%), Standard (100%) or High (135%) of the safe risk cap.
- **Daily trading plan:** for each account, risk per trade, contract size, daily target, daily stop, walk-away amount and best-day cap, plus combined totals and the day's rules (sessions, setups, max trades, stop after N losses).
- **Save as my plan:** stored in the `Projection` table (one per member, `supabase/migrations/0002_projection.sql`). A **Today's plan** card then shows on the dashboard, and coaches see it in the Coach Portal.
- Tests: `src/lib/projection.test.ts`.

## Phase 3 — UI (`src/components`)

The theme is "Night Ops": cool dark HUD panels with clipped corners, an animated grid background and a slow scanline. Headings use Orbitron, the UI uses Rajdhani, numbers use JetBrains Mono. Orange appears only in small details: the brand mark, the active-tab tick, the XP bar tip, the edge of primary buttons, and the live indicator dot. All motion respects `prefers-reduced-motion`.

- **Member dashboard.** An XP/level strip up top (XP comes from logging trades, following the plan and green days), with P/L for today, this week and this month, plus 30-day win rate and plan-followed rate.
  - Left: **account plans**. One tab per account, each with its pass plan, drawdown meter, consistency check, pass probability and rules. Below that, the **income roadmap**: month → week → day, per account.
  - Right: the **trading journal**, with account filters and expandable rows showing notes, screenshots and coach feedback, plus the **New log** modal.
- **Coach portal.** Summary counts, search, and three sorts: **Highest drawdown risk**, **Most recent trades**, **Failing consistency**. Each member row expands to show their full plan, journal and feedback tools.

### The planner math (`src/lib/planner.ts`, `src/lib/pace.ts` — unit-tested)
- **Pass plan.** The minimum days come from the firm's rule or from the consistency rule, whichever is higher (a 40% cap means at least 3 days). The daily goal is target ÷ days.
  - Risk per trade is capped so the account survives the expected worst losing streak, ln(N)/ln(1/(1−win rate)).
  - The planner also sets a personal daily stop at 80% of the DLL or 35% of max loss, whichever is lower.
  - Contracts are sized from the member's stop in points and the instrument's point value.
- **Pass odds.** A Monte Carlo simulation runs 1,500 attempts under the account's real drawdown model (EOD vs intraday trailing, locking at the starting balance) and its DLL.
- **Income plan.** Take-home goal ÷ profit split gives the gross goal. That's divided across funded accounts (counting copy-trade quantity) and broken into week and day targets. It also compares each account's daily capacity at safe risk and reports how many funded accounts the goal needs.
- **Pace.** The planner replays end-of-day balances to find the trailing floor, then gives each account a status: on pace, ahead, behind, at risk (under 25% of drawdown left, or breaking the consistency rule), passed or failed.

---

## Setup

1. **Install:** `npm install`
2. **Supabase:** create a project, then copy the pooled (6543) and direct (5432) connection strings into `.env` (see `.env.example`).
   All data access goes through the server using Prisma. Either turn off the Data API in Supabase settings, or leave RLS enabled with no policies, so the tables can't be reached with the public anon key.
3. **Discord application** (discord.com/developers/applications)
   - OAuth2: add redirect `http://localhost:3000/api/auth/callback/discord` and your production URL. Copy the Client ID and Secret.
   - Bot (recommended): create a bot, invite it to your server with no permissions, and copy the token into `DISCORD_BOT_TOKEN`. It's only used to re-check roles.
   - In Discord, turn on Developer Mode. Right-click your server → **Copy Server ID**. Right-click the **Admin** and **Trading Coach** roles → **Copy Role ID**.
4. **Secrets:** `npx auth secret` for `AUTH_SECRET`; `openssl rand -base64 32` for `TOKEN_ENCRYPTION_KEY`.
5. **Database:** `npm run db:migrate` then `npm run db:seed` (loads the 90-account catalog).
6. **Run:** `npm run dev`. Tests: `npm test`.
7. **Deploy:** Vercel. Set the same env vars, set `AUTH_URL` to your domain, and run `npm run db:deploy` on release.

**Catalog note:** rules were checked on Sep 27, 2026. Eight Bulenox rows are flagged `VERIFY` and show a "Rules: verify" tag in the UI. Coaches can correct any row in the portal API. Accounts members already hold keep the rules they were bought under.

## Preview
`preview/` renders the real components with sample data and a mock API into one static HTML file (`preview/build.mjs`), so the design can be reviewed without a database.

---

## Live deployment (Railway + Supabase)

The live site runs from `deploy/` so it can be updated without GitHub:

- **Server:** `deploy/server.ts` (Bun + Hono) → built into one file by `deploy/build.mjs` → pasted into the Railway Function `flowhub` (project **FLOWHUB**). Same rules, security model and planner code as the Next.js app (`src/lib/*` is shared).
- **Browser app:** `deploy/client.tsx` (the same React components) → gzipped into the `AppAsset` table in Supabase and served by the server. React loads from esm.sh.
- **Database:** Supabase project in the FLOWMTD organization. Schema = `supabase/migrations/0001_flowhub_schema.sql` (identical table/column names to `prisma/schema.prisma`, so the Next.js app can take over the same database later). The server connects as a dedicated `flowhub_app` role; RLS blocks the public Supabase API.
- **Railway variables:** `DATABASE_URL`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `PUBLIC_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `DISCORD_ADMIN_ROLE_IDS`, `DISCORD_COACH_ROLE_IDS`, `DISCORD_MEMBER_ROLE_IDS`, `DISCORD_BOT_TOKEN`, `FLOWHUB_LAUNCHED`.
- **Access gate:**
  - The Discord **Coach** role gets the admin and coach views, and always has access.
  - Until `FLOWHUB_LAUNCHED=true`, everyone else sees "FLOWHUB isn't open yet".
  - After launch, only roles listed in `DISCORD_MEMBER_ROLE_IDS` (Premium and Mentorship) can sign in.
  - On every boot the server logs the server's role names and IDs (`FLOWHUB roles: …`), so Developer Mode isn't needed.
- **Discord redirect URL:** `https://<your domain>/auth/callback`
