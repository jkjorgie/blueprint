# Tasks

Jay sends current assignments with full specs directly. This file is the longer-range plan.

How this is organized: Jay's tasks form the dependency spine, so they are ordered and each one unblocks something. Marcus's and Terrystan's tasks come in batches. Everything in a batch can be started today and finished without waiting on anyone. When Jay's spine reaches a milestone, the next batch opens.

Sizes: S = an afternoon, M = two to three days. Every PR must pass `npm run lint`, `npm run typecheck`, and `npm test`, and must be usable with only the keyboard. That is not repeated below.

Already built: sign-in and sign-out, the three account tiers, the data model, `requireUser()` in `src/lib/session.ts`, the JSON schema contract and the `RecordErrors` type in `src/lib/schema/app-schema.ts`, the base stylesheet, and a test harness with axe.

---

## Jay: the spine

Do these in order. Each one is what the next batch for the others is waiting on.

**J1 Record validator** (S) → unblocks J2. DONE 2026-09-13.
`src/lib/schema/record-schema.ts`. `buildRecordSchema(appSchema)` returns a Zod object for one record's `data`: required, `maxLength`, `min`/`max`, select options, date as `YYYY-MM-DD`, boolean coerced from `"on"`/missing. `parseRecord(appSchema, formData)` returns `{ ok: true, data }` or `{ ok: false, errors: RecordErrors }`.
Done when: a unit test covers every field type valid and invalid.

**J2 Create-record action** (S) → unblocks J3. DONE 2026-09-13.
`src/app/actions/records.ts`, `createRecord(applicationId, prevState, formData)`: `requireUser()`, owner-or-member check, J1, insert, `revalidatePath`. Returns `{ errors }` on failure.
Done when: a member's submission is saved and a non-member's is refused.

**J3 App page and wiring** (S) → completes the Sprint 1 walking skeleton. DONE 2026-09-13, except the dashboard links, which land with M2 and T2.
`src/app/apps/[appId]/page.tsx`: load, `notFound()` for non-owner non-member, render M1 wired to J2, link from both dashboards.
Done when: user@blueprint.local can submit a Bug Report and see it in Terrystan's table on the Vercel site.

**J4 Application actions** (S) → with M5 and T6 below, this is the whole schema-driven app definition requirement
`src/app/actions/applications.ts`: `createApplication`, `updateApplication`, `publishApplication`, `unpublishApplication`. `requireUser(["ANALYST"])`, ownership check, `parseAppSchemaJson`, return the error list on failure.
Done when: tests cover a valid save, an invalid schema, and another analyst's app.

**J5 Field removal policy** (S)
Removing a field keeps its data in JSON and stops rendering it. Test that a record with an extra key still renders.

**M5 New application page** (M, moved from Marcus on 2026-09-16)
`src/app/apps/new/page.tsx`: name, slug (auto-filled from name, editable), description, JSON textarea pre-filled with a starter example. Calls `createApplication`. On failure a `role="alert"` summary lists every error. On success go to the app page. Link from the analyst dashboard.
Done when: bad JSON shows the specific errors, the sample schema creates a draft.
**T6 Edit application page** (M, moved from Terrystan on 2026-09-16)
`src/app/apps/[appId]/edit/page.tsx`, same form as Marcus's M5 pre-filled (share the form component with him), calling `updateApplication`. Publish and Unpublish buttons. Owner only, linked from the app page.
Done when: changing a label shows on the form, unpublishing hides the app from end users.
**T7 Analyst user management** (M, moved from Terrystan on 2026-09-16)
`src/app/users/page.tsx`, `requireUser(["ANALYST"])`. List users where `managedById` is the analyst. Create form (name, email, temporary password). Per user, checkboxes for membership in each of the analyst's apps, saved by one action. Never show another analyst's users.
Done when: creating a user and ticking "Bug Reports" lets them sign in and see it.
**T8 Role builder** (M, moved from Terrystan on 2026-09-16)
On the edit-app page a "Roles" section: list, add (name plus four permission checkboxes), delete. Then a role dropdown per membership on T7's page.
Done when: a "Viewer" role with only view, assigned to a user, hides the create form for them.

**J6 Roles and permissions model** (M) → opens Batch 3
`AppRole` (applicationId, name, canView, canCreate, canEdit, canDelete), optional `roleId` on `AppMembership`, migration. `can(user, app, "edit")` in `src/lib/permissions.ts`: owner can do everything, member with no role can view and create. Enforce in J2 and the app pages.
Done when: unit tests cover owner, member with role, member without role, non-member, for each permission.

**J7 Enforce permissions on edit and delete** (S, needs Marcus M6)
Wire `can()` into `updateRecord` and `deleteRecord`. Hide buttons in the UI when not allowed, but the server check is the gate.

**J8 Accessibility audit** (M, Sprint 4)
VoiceOver through the whole core path. Findings in `docs/a11y-report.md`, fix everything on the core path.

**J9 Final deployment and demo script** (S, Sprint 4)
Vercel matches `main`, demo accounts ready, `docs/demo.md` with the click path.

**Ongoing:** review every PR within a day. Run the demo path on Vercel before each sprint review.

---

## Marcus

### Batch 1: start now, no dependencies

**M1 Form renderer** (M). DONE 2026-09-13, built by Jay so it landed with the walking skeleton.
`src/components/schema-form/schema-form.tsx`. Props: `schema: AppSchema`, `action`, `errors?: RecordErrors`, `defaultValues?`. One control per field: text and textarea as inputs, number as `type="number"`, boolean as a checkbox, date as `type="date"`, select as a native `<select>` with a blank first option. Every control has `<label htmlFor>`, `helpText` connected with `aria-describedby`, and when `errors[field.name]` exists, an error message also connected with `aria-describedby` plus `aria-invalid="true"`. Use the `label`, `input`, `field-hint`, and `field-error` classes. Develop it against a dummy action that returns fake errors; Jay wires the real one in J3.
Done when: the "Bug Reports" schema renders five labeled controls, an axe test passes, and a test proves an error is attached to the right field.

**M2 Analyst dashboard: my apps** (S)
On `/dashboard` for ANALYST: list the analyst's applications with name, description, Published or Draft, and record count. Link each to `/apps/[appId]` (the page will 404 until J3 lands, that is fine). Empty state text: "You have no applications yet."
Done when: analyst@blueprint.local sees "Bug Reports" with a record count.

**M3 Loading and error UI** (S)
`loading.tsx` and `error.tsx` under `src/app/dashboard/` and `src/app/apps/[appId]/`. Error UI is readable and has a link back.
Done when: throwing inside the dashboard page shows the error UI instead of a blank screen.

**M4 Admin console** (M, Sprint 3, after your M6 so the server-action pattern is familiar)
`src/app/admin/page.tsx`, `requireUser(["ADMIN"])`. Table of analysts (name, email, Active or Inactive). Create form: name, email, temporary password, shown once after creation. Deactivate and reactivate buttons as small forms with server actions in `src/app/actions/admin.ts`.
Done when: a deactivated analyst is bounced to sign-in on their next page load.

### Batch 2: after J4 lands

**M6 Edit and delete responses** (M, Sprint 2)
`src/app/apps/[appId]/records/[recordId]/edit/page.tsx` using M1 pre-filled via `defaultValues`. `updateRecord` and `deleteRecord` in `src/app/actions/records.ts`, owner-or-member check for now. Delete has a confirm page, not `window.confirm`.
Done when: editing a seeded record updates the table, deleting removes it after confirming.

### Batch 3: after J6 lands

**M7 Sortable columns** (S)
Sort links on Terrystan's table headers, `?sort=field&dir=asc|desc`, sorting in the Prisma query, `aria-sort` on the active header, default newest first.

**M8 CSV export** (S, stretch)
"Export CSV" on the records page, respects search and sort, field labels as headers.

---

## Terrystan

### Batch 1: start now, no dependencies

**T1 Records table** (M)
`src/components/records-table.tsx` and `src/app/apps/[appId]/responses/page.tsx`. UI copy says "responses", code says records. Owner-or-member check (copy the pattern: `requireUser()`, then query the app with its memberships). `<table>` with a `<caption>` naming the app, `<th scope="col">` per field using the label, plus a "Submitted" column. Booleans as "Yes"/"No", dates readable, missing values blank. Empty state is a paragraph, not an empty table.
Done when: the two seeded records render, an axe test passes, the page links back to the app.

**T2 End-user dashboard: my apps** (S)
On `/dashboard` for END_USER: apps the user is a member of, each linking to `/apps/[appId]`. Empty state: "You have not been added to any applications yet."
Done when: user@blueprint.local sees "Bug Reports".

**T3 Change password** (S)
`src/app/account/page.tsx` for any signed-in user: current password, new password, confirm. Action in `src/app/actions/account.ts` verifies the current password with `bcrypt.compare` and requires at least 12 characters. Link it from the header next to Sign out.
Done when: a wrong current password is rejected, a correct one lets the user sign in with the new password.

**T4 Demo seed apps** (S, Sprint 2)
Two more sample apps in `prisma/seed.ts`, for example "Equipment Requests" and "Event RSVPs", each with five to eight fields covering every field type and a few records each. Give user@blueprint.local membership in both. Run `npm run db:seed` to load them (it upserts, so it is safe on the shared database).
Done when: both apps appear on the analyst dashboard with records.

**T5 Search** (S, Sprint 2, after your own T1)
A search form above the table using `?q=`. Case-insensitive match against every text and textarea field. Keep the query in the input, announce "N results for 'query'" in a live region.
Done when: searching "Safari" in Bug Reports returns one row, clearing returns both.

### Batch 3: Sprints 3 and 4

**T10 Keyboard and screen-reader test pass** (S, Sprint 4)
Walk sign-in, both dashboards, the app form, and the responses table with the keyboard only, then again with VoiceOver on a Mac. For each problem write one line in `docs/a11y-findings.md`: the page, what you did, what happened, what should have happened. Do not fix anything in this task; Jay triages the list into fixes. This is how the WCAG requirement gets verified, so be thorough and honest.
Done when: the file exists with every page covered, even the ones with no findings, and each finding has a repro step.

**T9 Per-app accent color** (S, Sprint 3, stretch)
Optional `accent` on the application from a fixed list of six AA-safe colors, used on the app page heading bar and primary button.

---

## Sprint mapping

| Sprint | Jay | Marcus | Terrystan |
|---|---|---|---|
| 1 | J1, J2, J3, M1 | M2, M3 | T1, T2, T3 |
| 2 | J4, J5, M5, T6 | M6 | T4, T5 |
| 3 | J6, J7, T7, T8 | M4, M7 | T9 |
| 4 | J8, J9 | M8 | T10 |

On 2026-09-16 M5, T6, T7, and T8 moved to Jay: they define a core requirement or cross the tenant boundary, so they belong with the auth and actions work. Marcus and Terrystan keep the single-page tasks that build on the form renderer, the table, and existing patterns.
