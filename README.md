# Blueprint

Blueprint turns a JSON table definition into a working, accessible web app. A business analyst describes their fields, publishes the app, and their end users get create and edit forms with validation plus a searchable, sortable list view. Every generated interface targets WCAG 2.1 AA.

This is our CSE 499 capstone project. The plan is in [project-plan/project-plan.md](project-plan/project-plan.md), open tasks are in [docs/backlog.md](docs/backlog.md), and how we work is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Team

Jay Jorgensen (lead)
    "Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill

Marcus Palmer
    "That which you persist in doing becomes easy to do, not that the nature of the thing has changed but your power to do has increased."
    Ralph Waldo Emerson

## Install

1. Install Node 22 from https://nodejs.org (the LTS download). Check it worked:
   ```bash
   node -v
   ```
2. Clone the repo and go into it:
   ```bash
   git clone https://github.com/jkjorgie/blueprint.git
   cd blueprint
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Ask Jay for the `.env` file and put it in the `blueprint` folder, next to `package.json`. Do not commit it.

That's it. We all share one database, so there is nothing to set up or migrate.

## Run

1. Start the app:
   ```bash
   npm run dev
   ```
2. Open http://localhost:3000.
3. Sign in with one of these. The password for both is `password123`.

   | Email | Who they are |
   |---|---|
   | analyst@blueprint.local | Business analyst (owns the sample "Bug Reports" app) |
   | user@blueprint.local | End user (member of "Bug Reports") |

Press `Ctrl+C` in the terminal to stop the app.

## Before you open a pull request

```bash
npm run lint
npm run typecheck
npm test
```

All three must pass. See [CONTRIBUTING.md](CONTRIBUTING.md) for the rest.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma 7 on Supabase Postgres, Auth.js v5, Zod, Vitest with jest-axe. Deployed on Vercel.
