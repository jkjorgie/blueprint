# Backlog

Tasks are grouped by sprint and sized S (an afternoon), M (a few days), or L (most of a sprint). Tasks marked **starter** are self-contained and a good first pull request. Put your name in the Owner column when you pick one up.

The scaffolding already provides: the data model, sign-in and sign-out, the `requireUser` helper, the JSON schema contract with validation, the base stylesheet and layout, and a test harness with axe.

## Sprint 1: walking skeleton

Goal: an end user can open the seeded "Bug Reports" app, submit a record through a generated form, and see it in a list.

| ID | Task | Size | Owner | Notes |
|---|---|---|---|---|
| S1-1 | **Record validator** (starter) | S | | `src/lib/schema/record-schema.ts`. Write `buildRecordSchema(appSchema)` that returns a Zod object validating one record's `data` against the app's fields: required, maxLength, min/max, select options, date format, boolean coercion from form data. Unit test every field type. Pure function, no UI. |
| S1-2 | **Form renderer** | M | | `src/components/schema-form/`. A component that takes an `AppSchema` and renders one control per field. Text and textarea as inputs, number as `type="number"`, boolean as a checkbox, date as `type="date"`, select as a native `<select>`. Every control gets a `<label>`, `helpText` via `aria-describedby`, and an error slot. Accepts a server action as its `action` prop and shows errors returned from it. Add an axe test. |
| S1-3 | **Create-record server action** | S | | `src/app/actions/records.ts`. `createRecord(applicationId, prevState, formData)`: `requireUser`, confirm the user owns the app or has an `AppMembership`, validate with S1-1, insert a `DataRecord`, `revalidatePath`. Return field errors in a shape S1-2 can display. |
| S1-4 | **App page** | S | | `src/app/apps/[appId]/page.tsx`. Loads the app (404 if the user is not owner or member), shows its title, renders S1-2 wired to S1-3. |
| S1-5 | **Records list** (starter) | M | | `src/app/apps/[appId]/records/page.tsx` plus `src/components/records-table.tsx`. A `<table>` with a `<caption>`, `<th scope="col">` from the schema, one row per record. Format booleans and dates for humans. Sorting and search come in Sprint 2, so keep the component open to that. Add an axe test. |
| S1-6 | **Analyst dashboard: my apps** | S | | Replace the placeholder cards on `/dashboard` for the ANALYST role with a list of the analyst's applications linking to S1-4 and S1-5. |
| S1-7 | **End-user dashboard: my apps** (starter) | S | | Same as S1-6 for END_USER, listing apps they are a member of. |
| S1-8 | **Vercel deploy** | S | | Create the Vercel project, point `DATABASE_URL` at the Neon `main` branch, set `AUTH_SECRET`, set the build command to `prisma migrate deploy && npm run build`. Document the URL in the README. |

## Sprint 2: schema-driven apps

Goal: an analyst can create, edit, and publish an app from JSON with clear validation feedback, and the renderer covers every field type well.

| ID | Task | Size | Owner | Notes |
|---|---|---|---|---|
| S2-1 | **New application page** | M | | `src/app/apps/new/page.tsx`. Name, slug, description, and a JSON textarea. Server action runs `parseAppSchemaJson`, shows every error in a list linked from a `role="alert"` summary, saves as a draft on success. ANALYST only. |
| S2-2 | **Edit and republish** | M | | `src/app/apps/[appId]/edit/page.tsx`. Same form pre-filled. Publish and unpublish actions. Decide and document what happens to existing records when a field is removed (recommended: keep the data, stop rendering it). |
| S2-3 | **Error states for every field type** (starter) | S | | Audit S1-2 against S1-1: each validation failure produces a specific message next to the right control, focus moves to the first invalid control on submit, and the error is announced by a screen reader. |
| S2-4 | **Sortable columns** (starter) | S | | Add sort links to the S1-5 table headers using `?sort=field&dir=asc`. Set `aria-sort` on the active header. Sorting happens in the database query. |
| S2-5 | **Search** (starter) | S | | Add a search form above the S1-5 table using `?q=`. Match against every text field in the JSON. Keep the query in the input after submit and announce the result count. |
| S2-6 | **Accessibility pass** | M | | Run the app with VoiceOver (macOS) and NVDA (Windows) through sign-in, create record, and list. Write findings in `docs/a11y-report.md` and file a task for each defect. |

## Sprint 3: authorization and user management

| ID | Task | Size | Owner | Notes |
|---|---|---|---|---|
| S3-1 | **Admin console** | M | | `src/app/admin/page.tsx`, ADMIN only. List analysts, create an analyst (name, email, temporary password), deactivate and reactivate. Deactivation must lock the user out on their next request. |
| S3-2 | **Analyst user management** | M | | `src/app/users/page.tsx`, ANALYST only. Create end users (`managedById` = the analyst), grant and revoke `AppMembership` per app. An analyst must never see another analyst's users or apps. |
| S3-3 | **Roles and permissions model** | L | | Add `AppRole` (name, permissions: view, create, edit, delete) and attach it to `AppMembership`. Role builder UI. Enforce in every records action. This is the Enhancement requirement, so it comes after S3-1 and S3-2. |
| S3-4 | **Edit and delete records** | M | | Edit form pre-filled from an existing record, delete with a confirm step. Both actions re-check membership and, once S3-3 exists, permission. |
| S3-5 | **Password change** (starter) | S | | Signed-in users can change their password. Current password required. |

## Sprint 4: polish and stretch

| ID | Task | Size | Owner | Notes |
|---|---|---|---|---|
| S4-1 | **Demo seed apps** (starter) | S | | Two or three more realistic sample apps in `prisma/seed.ts` for the final demo. |
| S4-2 | **Loading and error UI** (starter) | S | | `loading.tsx` and `error.tsx` under `src/app/apps/[appId]/`. Errors must be readable and offer a way back. |
| S4-3 | **Visual schema builder** | L | | Point-and-click field editor that produces the same JSON. Stretch. |
| S4-4 | **CSV export and import** | M | | Stretch. Export a list to CSV; import CSV rows through the record validator. |
| S4-5 | **Per-app theming** | S | | Stretch. Analyst picks an accent color; verify contrast stays AA. |
