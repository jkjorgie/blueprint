# Blueprint

Blueprint turns a JSON table definition into a working, accessible web app. A business analyst describes their fields, publishes the app, and their end users get create and edit forms with validation plus a searchable, sortable list view. Every generated interface targets WCAG 2.1 AA.

This is our CSE 499 capstone project. The full plan, requirements, and sprint schedule are in [project-plan/project-plan.md](project-plan/project-plan.md). Open work is tracked in [docs/backlog.md](docs/backlog.md).

## Team

Jay Jorgensen (lead)
    "Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill

Marcus Palmer
    "That which you persist in doing becomes easy to do, not that the nature of the thing has changed but your power to do has increased."
    Ralph Waldo Emerson

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Auth.js v5, email + password, JWT sessions |
| Styling | Tailwind CSS v4 with our own design tokens in `src/app/globals.css` |
| Validation | Zod |
| Tests | Vitest, Testing Library, jest-axe |
| Hosting | Vercel + Supabase Postgres |

## Getting started

You need Node 22 (see `.nvmrc`) and a free Supabase project of your own (https://supabase.com). Each developer gets their own project so nobody's migrations or resets affect anyone else.

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Create your local env file
cp .env.example .env
# paste your Supabase session-pooler URI into DATABASE_URL (see the comments in .env.example)
# replace AUTH_SECRET with the output of: openssl rand -base64 32

# 3. Apply migrations and load sample data
npm run db:migrate
npm run db:seed

# 4. Run the app
npm run dev
```

Open http://localhost:3000 and sign in with one of the seeded accounts. The password for all of them is `password123` unless you changed `SEED_PASSWORD`.

| Email | Tier |
|---|---|
| admin@blueprint.local | Administrator |
| analyst@blueprint.local | Business analyst (owns the sample "Bug Reports" app) |
| user@blueprint.local | End user (member of "Bug Reports") |

### Databases

| Database | Used by |
|---|---|
| Jay's production Supabase project | The deployed app on Vercel. Only `prisma migrate deploy` from the build touches it. |
| your own Supabase project | Your local `npm run dev`. Reset it whenever you like with `npm run db:reset`. |

Two Supabase details that matter:

- Use the **session pooler** (port 5432) locally. Prisma migrations do not work through the transaction pooler (port 6543).
- Keep `?uselibpqcompat=true&sslmode=require` on the URL. Without it the Postgres driver rejects Supabase's certificate chain.

Working offline? `npx prisma dev` starts a local Postgres in your terminal with no install. Copy the connection string it prints into `DATABASE_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` / `npm run test:watch` | Vitest once / in watch mode |
| `npm run db:migrate` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Load the seed accounts and sample app |
| `npm run db:reset` | Drop the database, re-apply migrations, re-seed |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run db:generate` | Regenerate the Prisma client (runs automatically on install) |

## Project layout

```
prisma/
  schema.prisma          data model (users, applications, memberships, records)
  seed.ts                sample accounts and app
src/
  app/                   routes (App Router)
    actions/             server actions ("use server")
    api/auth/            Auth.js route handler
    dashboard/           signed-in landing page
    sign-in/             login form
    globals.css          design tokens and shared component classes
    layout.tsx           root layout: skip link, header, main landmark, footer
  components/            shared UI
  lib/
    auth.ts              Auth.js setup (Credentials provider)
    auth.config.ts       the auth config that proxy.ts can safely import
    db.ts                the Prisma client
    session.ts           getCurrentUser / requireUser (use these, not auth())
    schema/app-schema.ts the JSON contract for an analyst-defined app
  proxy.ts               redirects signed-out visitors away from protected routes
  test/                  Vitest setup
```

## How the pieces fit

1. An analyst submits JSON. `parseAppSchemaJson` in `src/lib/schema/app-schema.ts` validates it and returns readable errors. The valid schema is stored on `Application.schema`.
2. End-user submissions are stored as JSON on `DataRecord.data`, keyed by field name. New apps never require a database migration.
3. Every protected page calls `requireUser()` from `src/lib/session.ts`, which reads the session token and then re-checks the user row, so deactivated accounts are locked out immediately.
4. Every server action must also call `requireUser()` and verify the user owns or is a member of the application it touches. Server actions are reachable by direct POST, so hiding a button is never enough.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch and review workflow.
