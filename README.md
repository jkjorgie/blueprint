# Blueprint

Blueprint turns a JSON table definition into a working, accessible web app. A business analyst describes their fields, publishes the app, and their end users get create and edit forms with validation plus a searchable, sortable list view. Every generated interface targets WCAG 2.1 AA.

This is our CSE 499 capstone project.

## Team

Jay Jorgensen (lead)
"Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill

Marcus Palmer
"That which you persist in doing becomes easy to do, not that the nature of the thing has changed but your power to do has increased."
Ralph Waldo Emerson

Terrystan Sustal
"Success is not an accident, it's a choice. Keep on pressing forward and learn how to fail" - My Basketball Trainer

## Requirements

Core, all delivered:

- **Schema-driven app definition.** An analyst creates, edits, and publishes an application from a JSON field definition, with clear validation errors.
- **Generated CRUD interface.** Each published schema becomes a working form and a responses list, with all data persisted.
- **WCAG 2.1 AA accessibility.** Keyboard navigation, labels, contrast, focus management, and screen reader support, checked by automated axe tests on every component.
- **Authentication and account tiers.** Secure sign-in for administrators, business analysts, and end users.
- **Scoped user management.** Each analyst manages only their own end users and applications.

Enhancements delivered:

- **Custom roles and authorization.** Analysts define roles per application (view, create, edit, delete, own or all responses), enforced on the server.
- **Edit, delete, search, and sort** on the responses list.
- **Custom CSS per application,** scoped so it cannot affect the platform.
- **Repeating groups,** a list of sub-fields an end user can fill in several times within one response.

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
4. Team members: ask Jay for the `.env` file and put it in the `blueprint` folder, next to `package.json`. Do not commit it. We all share one database, so there is nothing to set up or migrate.

### Running with your own database

If you are not on the team, point the app at any PostgreSQL database:

```bash
cp .env.example .env
# set DATABASE_URL to your database, and AUTH_SECRET to the output of: openssl rand -base64 32
npm run db:deploy   # create the tables
npm run db:seed     # load the demo accounts and sample applications
```

To create an administrator account:

```bash
ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="<at least 12 characters>" npm run db:bootstrap
```

## Run

1. Start the app:
   ```bash
   npm run dev
   ```
2. Open http://localhost:3000.
3. Sign in with one of these. The password for both is `blueprint-demo`.

   | Email                   | Who they are                                         |
   | ----------------------- | ---------------------------------------------------- |
   | analyst@blueprint.local | Business analyst (owns the sample "Bug Reports" app) |
   | user@blueprint.local    | End user (member of "Bug Reports")                   |

Press `Ctrl+C` in the terminal to stop the app.

## Before you open a pull request

```bash
npm run format
npm run lint
npm run typecheck
npm test
```

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma 7 on Supabase Postgres, Auth.js v5, Zod, Vitest with jest-axe. Deployed on Vercel.
