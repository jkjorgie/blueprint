# Contributing

## Workflow

1. Pick a task from [docs/backlog.md](docs/backlog.md) and put your name next to it.
2. Branch from `main`: `git switch -c <your-name>/<short-task-name>`.
3. Commit as you go. Small commits are easier to review than one big one.
4. Push and open a pull request. Fill in the template. CI must be green.
5. Get one review from another team member, then squash-merge.

Never push directly to `main`.

## Definition of done

- `npm run lint`, `npm run typecheck`, and `npm test` pass.
- New logic in `src/lib` has a unit test.
- New pages have an axe test (see `src/app/page.test.tsx` for the pattern).
- You completed the feature with the keyboard only, and focus is always visible.
- Every input has a `<label>`; every error message is tied to its input with `aria-describedby`.
- Server actions call `requireUser()` first and check ownership or membership before reading or writing.

## Conventions

- Prefer server components. Add `"use client"` only where you need state, effects, or event handlers.
- Mutations go in `src/app/actions/*.ts` with `"use server"` at the top of the file.
- Read the signed-in user through `src/lib/session.ts`, never through `auth()` directly, except in the header and proxy.
- Use the shared classes in `src/app/globals.css` (`btn`, `input`, `label`, `field-error`, `card`) so styling and contrast stay consistent. Add a new class there rather than repeating a long utility string.
- Use semantic color names (`text-ink-muted`, `bg-surface`, `border-line`, `bg-brand-700`), not raw palette colors.
- Validate with Zod at the boundary (form data, JSON input) and derive TypeScript types from the Zod schema.

## Database changes

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` and give the migration a descriptive name.
3. Commit the new folder under `prisma/migrations/` with your code.
4. If the seed needs to change, update `prisma/seed.ts` and run `npm run db:seed`. It upserts, so re-running is safe.
5. Tell the team before you run `db:migrate`. It changes the shared database for everyone.

## Getting unstuck

Ask in the team chat early. Post what you tried and the exact error text.

## Project layout

```
prisma/
  schema.prisma          data model (users, applications, memberships, records)
  seed.ts                demo accounts and sample app
  bootstrap.ts           creates the first admin account
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

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` / `npm run test:watch` | Vitest once / in watch mode |
| `npm run db:migrate` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Re-load the demo accounts and sample app |
| `npm run db:bootstrap` | Create or reset the admin account (see Production) |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run db:generate` | Regenerate the Prisma client (runs automatically on install) |

## The database

We all share one Supabase database, and it is the same one the deployed site uses. That keeps setup to zero, with two consequences:

- Anything you create or delete while developing is visible to everyone, including on the live site.
- There is no `db:reset`. It would drop the production database, so the script was removed on purpose.

Two Supabase details if you ever edit the connection string:

- Migrations (`db:migrate`) need the **session pooler** on port 5432. The transaction pooler on port 6543 does not support them.
- Keep `?uselibpqcompat=true&sslmode=require` on the URL. Without it the Postgres driver rejects Supabase's certificate chain.

## Production

Migrations are applied by the Vercel build command, `prisma migrate deploy && npm run build`. Vercel needs `DATABASE_URL` (transaction pooler, port 6543), `DIRECT_URL` (session pooler, port 5432), and `AUTH_SECRET` set in its environment variables.

The admin account was created once with `db:bootstrap`. To reset its password, run from your machine:

```bash
ADMIN_EMAIL="admin@blueprint.local" ADMIN_PASSWORD="<at least 12 characters>" npm run db:bootstrap
```
