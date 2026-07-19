# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js version warning

This repo uses **Next.js 16** (with React 19). APIs, conventions, and file structure may differ from older Next.js you may know. When in doubt, read the relevant guide in `app/node_modules/next/dist/docs/` before writing code, and heed deprecation notices.

## Working directory

All application code lives in `app/`. Run npm commands from `app/`, not the repo root. The repo root holds deployment/process config (`ecosystem.config.js`, `docker-compose.yml`) and design docs (`SDD-*`, `PLANO.md`, `pontuacao_bolao_copa.md`).

## Commands

```bash
cd app

npm run dev      # next dev (local development)
npm run lint     # eslint
npm run build    # next build — produces standalone output
npm run deploy   # build + copy static/public into standalone + pm2 restart 'bolao'
```

Database (Prisma, MySQL):

```bash
cd app
npx prisma migrate dev --name <name>   # create + apply a migration in dev
npx prisma migrate deploy              # apply pending migrations (prod)
npx prisma generate                    # regenerate client after schema edits
npx prisma studio                      # inspect data
npm run prisma db seed                 # runs prisma/seed.ts via tsx (configured under package.json "prisma.seed")
```

### Deployment — IMPORTANT

On the server, **never run `npm run build` alone** — that breaks the live app. Use `npm run deploy`, which builds, copies `.next/static` and `public/` into the standalone bundle, and restarts the pm2 process. The app runs as a standalone Next.js server (`output: "standalone"` in `next.config.ts`) started via `app/.next/standalone/server.js` under pm2 (process name `bolao`, defined in `ecosystem.config.js`).

Note on ports: pm2 runs the standalone server on `PORT=3001` (set in `ecosystem.config.js`, which also injects all of `app/.env`). `docker-compose.yml` exposes `127.0.0.1:3000` and is a separate path. There is no `PORT` validation — match the existing infra when changing it.

## Architecture

A World Cup 2026 prediction pool ("bolão"). Users join one or more pools, predict match outcomes (home win / draw / away win — **no exact-score predictions**), and are ranked by points. Built on the Next.js App Router with all backend logic in API route handlers.

### Roles & access control

Two app-level roles (`Role`): `MASTER` (super admin) and `PARTICIPANTE`. Within each pool, `BolaoMember.role` is `ADMIN` or `PARTICIPANTE`. Access is enforced in [app/middleware.ts](app/middleware.ts):
- `/admin/*` and `/master/*` require `role === "MASTER"`; MASTER users are redirected from `/` to `/master`.
- Public routes (no auth): `/login`, `/cadastro`, `/entrar`, password-reset pages, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/jobs/*`, `/api/boloes/preview`. Everything else requires a session.
- Auth is **NextAuth with a Credentials provider** (email + bcrypt password) using JWT sessions; see [app/src/app/api/auth/[...nextauth]/route.ts](app/src/app/api/auth/[...nextauth]/route.ts). Login requires `UserStatus === "ATIVO"`. Session/JWT are extended with `id`, `role`, `status` (types in [app/src/types/next-auth.d.ts](app/src/types/next-auth.d.ts)).

### Route group layout

`app/src/app/` uses route groups: `(auth)` (login/signup/password flows), `(app)` (authenticated pages: ranking, meus-boloes, palpites-jogo, perfil, mensagens, admin, master, per-pool `bolao/[id]`), and `api/` (route handlers). The `api/` tree mirrors the domain: `boloes`, `predictions`, `matches`, `ranking`, `messages`, `user`, `admin/*` (MASTER ops + manual sync triggers), `master/*`, and `jobs/*` (cron sync endpoints).

### Predictions are scoped per pool

A `Prediction` is unique on `(bolaoId, userId, matchId)` — the same user predicting the same match in two pools has two independent prediction rows. Most prediction/score queries are scoped by `bolaoId`. The current pool is tracked client-side via [app/src/contexts/BolaoContext.tsx](app/src/contexts/BolaoContext.tsx).

### Scoring (the core domain logic)

All scoring lives in [app/src/lib/scoring.ts](app/src/lib/scoring.ts), function `recalculateScoresAndRoundBonuses`. It is a **full recompute**: it wipes `Score`, resets `Prediction.correct`, then rebuilds everything inside one transaction. Key facts:
- Phase points (`PHASE_POINTS`): GRUPOS 10, PLAYOFFS 15, OITAVAS 20, QUARTAS 30, SEMI 40, FINAL 50.
- A "round" (`Round`, unique on `(phase, number)`) is the bonus unit. Round bonus (`ROUND_BONUS_POINTS = 10`) is awarded to the top scorer(s) of each round **per pool**, only once **all** matches in that round are ENCERRADO (ties all get the bonus).
- A prediction is correct when `prediction === match.result`. `Score` is unique on `(bolaoId, userId, roundId)` and stores `roundPoints`, `bonus`, `accumulatedPoints`.
- Champion pick (`BolaoMember.championPick`, +100 pts) and final tie-breaker rules are described in [app/pontuacao_bolao_copa.md](app/pontuacao_bolao_copa.md) — the authoritative spec for scoring. Cross-check changes against it.

Recalculation is triggered after results sync (only when matches actually changed).

### External data sync

Three sync concerns, tracked by `SyncStatus` rows keyed `odds` / `matches` / `results` (see [app/src/lib/sync-status.ts](app/src/lib/sync-status.ts)). Cron-style endpoints under `app/src/app/api/jobs/sync-{matches,odds,results}` are protected by a `Bearer ${CRON_SECRET}` header (skipped if `CRON_SECRET` unset). Admins can also trigger syncs manually via `app/src/app/api/admin/{results,odds}/sync`.

- **Results** ([sync-results/route.ts](app/src/app/api/jobs/sync-results/route.ts)): primary source is the `LiveScoreMatch` table (populated externally — see `ntunnel_sqlite.php` at repo root, an external feed bridge). If empty, falls back to the football-data.org API, throttled to one call per 10 min. After processing, calls `recalculateScoresAndRoundBonuses` if anything changed.
- **Matches/odds**: match metadata and betting odds (`Odd` model; `favorite` derived from odds). A prediction may snapshot the `Odd` it was made against (`Prediction.oddId` / `oddTimestamp`).

Match-resolution helpers live in [app/src/lib/match-sync.ts](app/src/lib/match-sync.ts): external matches are matched to DB `Match` rows by `fifaMatchId` first, then by team-name pair (order-insensitive) + closest `dateTime`. Team names are normalized via `normalizeTeamName` ([app/src/lib/football-data.ts](app/src/lib/football-data.ts)) so the two data sources reconcile. `finalResultFromScore` resolves knockout draws using penalties (`homePenalty`/`awayPenalty`).

External API clients: [api-football.ts](app/src/lib/api-football.ts), [football-data.ts](app/src/lib/football-data.ts), [odds-api.ts](app/src/lib/odds-api.ts). Email via [mailer.ts](app/src/lib/mailer.ts) (nodemailer/SMTP, for password reset & notifications).

### Database

MySQL via Prisma ([app/prisma/schema.prisma](app/prisma/schema.prisma)). The Prisma client is a global singleton in [app/src/lib/prisma.ts](app/src/lib/prisma.ts) (re-used across hot reloads in dev). `binaryTargets` includes `linux-musl` for the Alpine-based Docker/standalone runtime. Several hot paths use `$queryRaw`/`$executeRaw` (e.g. sync, `SyncStatus` upsert) rather than the typed client — keep raw SQL in sync with schema changes.

Soft-deletion is used in places (e.g. `Bolao.deletedAt`, `BolaoStatus.EXCLUIDO`, `UserStatus.REMOVIDO`) — filter these out in queries rather than hard-deleting.

### Environment variables (`app/.env`)

`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CRON_SECRET`, external API keys (`API_FOOTBALL_KEY`, `FOOTBALL_DATA_KEY`, `ODDS_API_KEY`), SMTP (`SMTP_HOST/PORT/SECURE/USER/PASS`), `PORT`. `ecosystem.config.js` loads `app/.env` and passes it to the pm2 process.

## Language

Domain terms, UI strings, enum values, commit messages, and most identifiers are in **Portuguese** (e.g. `Bolao`, `palpites`, `PENDENTE`, `ENCERRADO`, `CASA`/`EMPATE`/`FORA`). Match this convention; don't anglicize existing names.
