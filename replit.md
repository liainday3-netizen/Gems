# Gem Ledger

A shared gem ledger and identity service — a virtual currency system where multiple apps can credit/debit gem balances for users, with API key auth to track which app made each transaction.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/gem-ledger run dev` — run the admin UI
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + shadcn/ui + TanStack Query + Wouter

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, wallets, transactions, api-keys)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/gem-ledger/src/` — React admin UI

## Architecture decisions

- API key auth via `x-api-key` header identifies which app is making ledger calls
- Debit transactions are rejected if they would push balance below zero
- Wallets are created automatically when a user is created
- Transaction records are immutable; balance is recomputed from wallet table, not replayed
- `glk_` prefix on generated API keys to distinguish them

## Product

- **Dashboard** — live stats: total users, gems in circulation, transaction count, per-app breakdown, recent feed
- **Users** — searchable user list with balances, create users, view full per-user transaction history
- **Wallets** — rich list sorted by balance
- **Transactions** — full ledger with userId/appSource filters; credit/debit form
- **API Keys** — create keys (shown once), toggle active/inactive, delete

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After adding new tables to `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking `artifacts/api-server` so declarations are fresh
- `pnpm --filter @workspace/db run push` must be run after schema changes
- API keys are prefixed with `glk_` and generated as UUIDs with hyphens stripped

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
