## What

<!-- One or two sentences on what this PR changes. Link the task from docs/backlog.md if there is one. -->

## How to test

<!-- Steps a reviewer can follow locally. -->

## Checklist

- [ ] `npm run lint`, `npm run typecheck`, and `npm test` pass
- [ ] Every new form control has a visible label and a clear error state
- [ ] I can complete the feature with the keyboard only (Tab, Shift+Tab, Enter, Space, arrows)
- [ ] Server actions check the user with `requireUser` before touching the database
- [ ] Schema changes include a migration (`npm run db:migrate`)
