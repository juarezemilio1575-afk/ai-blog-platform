# AI Blog Platform

An AI-managed, multi-blog, monetized content platform: topic discovery →
clustering → content briefs → AI drafting → SEO optimization → human
review → publish → internal linking → decay detection → social/newsletter
repurposing, with a real Prisma/Postgres schema, Auth.js authentication, an
admin dashboard, and an affiliate/monetization engine.

## ⚠️ Read this first: what's tested vs. what needs your environment

This project was built in a sandboxed environment **with no internet
access** — so some parts could be executed and verified directly, and some
parts could only be written correctly and are waiting for you to run them
where you have internet access, a database, and API keys.

**Actually executed and verified, with real output (not just written):**
all the core scoring/business logic in `src/lib/` — the Niche Analyzer,
Keyword Priority Scorer, Editorial Quality Score gate, Content Decay
Detector, Monetization math, Internal Linking Engine, Meta/Schema
generators, AI Cost Control, and the full mock-provider content pipeline
(topic discovery → brief → draft → SEO). Run it yourself:

```bash
npm install
npm run engines:selftest
```

**Written but not yet build-tested here** (needs `npm install` with
internet access, which this sandbox didn't have): the Next.js app itself —
all pages, API routes, the Prisma schema applied to a real database, auth,
and everything under `src/app/`. Follow the steps below, then run:

```bash
npm run type-check
npm run lint
npm run build
```

...and fix anything that surfaces — treat this README as a strong starting
point, not a guarantee-free zone. Don't ship section 32's requirements as
"done" until you've run those three commands yourself and they pass.

## 1. Installation

```bash
npm install
cp .env.example .env
# fill in .env — see "Environment variables" below
```

## 2. Database setup

Any managed Postgres works (Neon, Supabase, Railway, RDS, Vercel Postgres).
Put its connection string in `DATABASE_URL` in `.env`, then:

```bash
npm run db:generate   # generates the Prisma client
npm run db:migrate    # creates all tables from prisma/schema.prisma
npm run db:seed       # loads the demo blog: 12 articles, products,
                       # 56 days of SEO history, revenue, subscribers
```

After seeding, sign in at `/admin/login` with:
- Email: `admin@example.com`
- Password: `admin123`
**Change this password immediately** if you deploy anywhere public.

## 3. Environment variables

See `.env.example` for the full list with explanations. The essentials to
get running locally:

| Variable | Required for |
|---|---|
| `DATABASE_URL` | Everything — the app won't start without it |
| `AUTH_SECRET` | Admin login (`openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | Real AI content generation |
| `CRON_SECRET` | Automation endpoints (see "Automation" below) |
| `CLOUDINARY_*` | Real image uploads |

**Nothing here is required to explore the app.** Without an AI key, every
AI feature (Topic Discovery, Brief, Draft, SEO Optimize, Social Repurpose)
automatically falls back to the built-in offline **mock provider**
(`src/lib/ai/mock-provider.ts`), which returns deterministic placeholder
content so the whole pipeline — including the section 24 quality gate — is
exercisable end-to-end before you spend a cent on API calls.

## 4. Development

```bash
npm run dev
```

- Public site: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin`

## 5. Production build

```bash
npm run type-check
npm run lint
npm run build
npm start
```

## 6. Deployment (Vercel)

1. Push this repo to GitHub/GitLab/Bitbucket, import it in Vercel.
2. Add every variable from `.env.example` in Project Settings → Environment
   Variables (use your real production `DATABASE_URL`, a fresh
   `AUTH_SECRET`, etc).
3. Run `npm run db:migrate` (or `db:deploy` for a non-interactive
   migration) against the production database once, from your machine or
   a CI step, before the first deploy.
4. Deploy. `vercel.json` already declares the cron schedule (see below) —
   Vercel picks it up automatically.

## 7. Cron / automation configuration

**Architecture note:** the spec asks for ~11 different job times, editable
from the dashboard. Vercel Cron schedules are fixed at deploy time in
`vercel.json` — they can't be changed at runtime without a redeploy. The
actual solution here: `vercel.json` declares **one** cron entry that hits
`/api/automation/dispatcher` every 15 minutes; the dispatcher reads job
times from the `AutomationSchedule` table and fires whichever job is due.
Editing a time in **Admin → Alerts & Approvals** takes effect on the next
tick — no redeploy.

⚠️ **Vercel plan limitation:** the Hobby (free) plan only allows cron jobs
to run **once per day**, not every 15 minutes — that's a Pro-plan feature.
On Hobby, either upgrade to Pro, or point a free external scheduler
(GitHub Actions on a schedule, or cron-job.org) at
`POST /api/automation/dispatcher` with header
`Authorization: Bearer $CRON_SECRET` every 15 minutes instead — the route
doesn't care who calls it, only that the secret matches.

Set `CRON_SECRET` as an env var on the Vercel project — Vercel
automatically sends `Authorization: Bearer $CRON_SECRET` on its own cron
invocations. To trigger manually:

```bash
curl -X POST https://yourdomain.com/api/automation/dispatcher \
  -H "Authorization: Bearer $CRON_SECRET"
```

Signed-in admins can also trigger any individual job on demand from
**Admin → Automation**, without ever seeing the secret (it's attached
server-side by `/api/automation/[job]/trigger`).

**Jobs included:** discover-keywords, generate-articles, fact-check,
publish-scheduled, detect-decay, growth-agent, daily-report. Default
schedule is seeded by `prisma/seed.ts` — edit anytime from
**Admin → Alerts & Approvals**.

## 8. AI configuration

Set `AI_DEFAULT_PROVIDER` to `anthropic`, `openai`, or `mock` in `.env`.
The abstraction layer (`src/lib/ai/provider.ts`) automatically falls back
to `mock` if the configured provider's key is missing, so a
misconfiguration never hard-crashes the app — check **Admin → Settings**
to see which provider is actually active.

`src/lib/ai/cost-control.ts` routes simple tasks (image briefs, social
posts, SEO metadata) to the cheaper `AI_ECONOMY_MODEL` and everything else
(briefs, drafts, fact-checks) to `AI_PREMIUM_MODEL` — tune both env vars
and the `MODEL_PRICING` table to match your actual provider pricing. Every
call is logged to the `AiGeneration` table; **Admin → AI** shows total
spend, cost per article, and token usage.

## 9. Analytics configuration (Google Analytics / Search Console)

`AnalyticsSnapshot` and `SeoMetric` are already in the schema and the
`/api/analytics` routes already read from them — what's not wired up yet
is the actual GA4/GSC data pull, since that requires a Google Cloud
service account and OAuth consent screen that only make sense to set up
against your real property. To finish it:

1. Create a GCP service account, enable the Analytics Data API and Search
   Console API, and grant it read access on your GA4 property + GSC site.
2. Put its credentials in `GOOGLE_SERVICE_ACCOUNT_EMAIL` /
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (see `.env.example`).
3. Add `src/lib/analytics/google-analytics.ts` and
   `.../search-console.ts` using `googleapis`, and have a daily job (add
   one alongside the three in `vercel.json`) upsert their output into
   `AnalyticsSnapshot` / `SeoMetric`. The Content Decay Detector and SEO
   dashboard already consume those tables — no changes needed there once
   they're populated with real numbers instead of seed data.

## 10. Affiliate configuration

1. Sign up for the affiliate networks you want (Amazon Associates, Awin,
   Impact, or direct merchant programs) and add your credentials/tags in
   `.env` (see the `AMAZON_ASSOCIATES_TAG` / `AWIN_*` / `IMPACT_*` block).
2. Add products via `POST /api/products` (or build a simple admin form —
   the API already validates and persists everything needed).
3. Attach a product to an article as a `BEST_CHOICE` / `BUDGET_CHOICE` /
   `PREMIUM_CHOICE` / `PRODUCT_CARD` block via `ArticleAffiliateBlock` —
   changing a `Product.affiliateUrl` later updates every article that
   references it instantly, with no content edits (section 9).
4. Every "Check price" button already routes through
   `/api/affiliate/click` for tracking before redirecting — nothing else
   to wire up for click/EPC/RPM tracking, which already power **Admin →
   Monetization**.

## Project structure

```
prisma/schema.prisma       Full DB schema (users, blogs, articles, keywords,
                           AI generations, products, affiliate, revenue,
                           SEO metrics, automation, audit logs...)
prisma/seed.ts             Demo data (section 30)
src/lib/ai/                Provider abstraction (mock/anthropic/openai) +
                           content engine + all scoring algorithms
src/lib/seo/               Meta generator, schema markup, internal linking
src/lib/affiliate/         Monetization math
src/app/api/               All API routes (section 29)
src/app/(admin)/admin/     Admin dashboard (protected by middleware.ts)
src/app/(public)/          The public blog site
scripts/test-engines.ts    Self-test proving the core logic works today
```

## 11. Production hardening added in the audit pass

Beyond the original build, a full audit found and fixed real issues:

- **Security**: 17 API routes had no authentication check at all — anyone
  could create articles, products, or trigger AI generation. Every
  business-data route now requires an authenticated admin session via
  `requireAdminSession()` in `src/lib/api-utils.ts`. Public-facing routes
  (affiliate click tracking, newsletter signup) intentionally stay open.
- **Auth bug**: `.env.example` had the wrong variable name
  (`AUTH_SECRET` instead of `NEXTAUTH_SECRET`, which next-auth v4 actually
  reads) — this would have silently broken session security in production.
- **Content integrity** (`src/lib/ai/content-integrity.ts`): scans every
  article for fabricated testing/review language ("we tested", "in our
  lab") and hard-blocks publish unless `Article.hasVerifiedTesting` is
  explicitly set — a real, automated check, not just a prompt instruction.
- **Budget guard** (`src/lib/ai/cost-control.ts` → `getCurrentBudgetStatus`):
  `discover-keywords` and `generate-articles` check `AI_DAILY_BUDGET_USD` /
  `AI_MONTHLY_BUDGET_USD` before spending; at 100% they skip and log a
  critical `SystemAlert` instead of spending further — the site itself and
  already-published content are never affected.
- **Growth Agent** (`/api/automation/growth-agent`): daily analysis that
  auto-executes only low-risk actions (flagging decaying articles) and
  queues anything involving spend, data deletion, or structural change to
  the `ApprovalRequest` table — resolved from **Admin → Alerts &
  Approvals**, never auto-executed.
- **Monitoring**: `SystemAlert` table + `/api/health` (checks real DB
  connectivity, not just process uptime) + email dispatch when
  `EMAIL_SERVER_*` is configured.

Run `npm run engines:selftest` — it now also proves the content-integrity
checker correctly flags a fake testing claim and passes honest, spec-based
copy.

## Known gaps to close before a real launch

- Contact form (`/contact`) isn't wired to an email/API endpoint yet.
- Legal pages (Privacy Policy, Terms, Cookie Policy) are templates —
  have a lawyer review them for your jurisdiction before launch.
- Rate limiting (`src/lib/api-utils.ts`) is in-memory — fine for a single
  instance, swap for `rate-limiter-flexible` + Redis once you scale to
  multiple server instances.
- No automated test suite yet beyond `scripts/test-engines.ts` — add
  Vitest coverage for the API routes once the schema is stable in your
  environment (the `vitest` dependency is already in `package.json`).
