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
4. If the seed needs to change, update `prisma/seed.ts` and run `npm run db:reset` to confirm it still works from scratch.
5. Only ever run `db:migrate` and `db:reset` against your own Neon branch, never against `main`.

## Getting unstuck

Ask in the team chat early. Post what you tried and the exact error text.
