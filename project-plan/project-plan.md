# CSE 499 Project Plan

## Project Name: Blueprint

# Requirements:

List your project requirements with accompanying user stories. All the "core" requirements must be completed. Optional requirements are features you would like to add if time permits. For each requirement list the user stories you will be addressing.

## Required

Use this table to document the features of your project. **You must have at least 4 requirements.** Modify the table as needed.

| Requirement | C/E* | Description |
|---|---|---|
| Schema-driven app definition | C | A business analyst can create an application by supplying a JSON table definition (field names, types, required flags, option lists) and publish it to their end users. |
| Generated CRUD interface | C | Blueprint renders each published schema as a working web app: create and edit forms with validation plus a searchable, sortable list view, with all data persisted. |
| WCAG 2.1 AA accessibility | C | Every generated interface meets WCAG 2.1 AA: keyboard navigation, proper labeling, color contrast, focus management, and screen reader support, verified with automated and manual testing. |
| Authentication and account tiers | C | Secure login with three account tiers: admins manage the platform, business analysts build apps and manage their users, and end users work in the apps they are granted. |
| Custom roles and authorization | E | Business analysts define named roles (for example Editor, Reviewer, Viewer) as bundles of per-app permissions (view, create, edit, delete), and the server enforces those permissions on every action. |
| Scoped user management | C | Each business analyst can create and manage end-user accounts only for their own applications, giving every analyst an isolated workspace. |
| Visual schema builder and extras | E | A point-and-click schema builder that produces the same JSON definition, so analysts never touch raw JSON. Additional enhancements if time permits: CSV import/export and per-app theming. |
| Generated CRUD interface | E | Blueprint renders each published schema as a working web app: edit forms with validation plus a searchable, sortable list view, with all data persisted. |

\*C=Core, E=Enhancement

### User Stories

#### Schema-driven app definition (C)

| Name | Description |
|---|---|
| JSON | As a business analyst, I can create a new application by supplying a JSON table definition so that I get a working app without writing code. |
| EDIT | As a business analyst, I can edit an application's schema and republish it so that the app evolves with my needs. |
| VALIDATION | As a business analyst, I see clear validation errors when my schema is invalid so that I can fix it myself. |

#### Generated CRUD interface (C)

| Name | Description |
|---|---|
| CRUD | As an end user, I can add records through generated forms so that I can submit a response. |

#### WCAG 2.1 AA accessibility (C)

| Name | Description |
|---|---|
| KEYBOARD NAV | As an end user who relies on a keyboard, I can complete every task without a mouse. |
| SCREEN READER | As an end user who uses a screen reader, every form control, error message, and table is announced correctly. |

#### Authentication and account tiers (C)

| Name | Description |
|---|---|
| USER | As a user, I can sign in securely and only see what my account type allows. |
| ADMIN | As an admin, I can create and deactivate business analyst accounts. |

#### Custom roles and authorization (E)

| Name | Description |
|---|---|
| ROLES | As a business analyst, I can define a role and choose its permissions per application. |
| PROVISIONING | As a business analyst, I can assign a role to each of my users. |
| SECURITY | As an end user, I can only perform the actions my role permits, enforced on the server rather than only hidden in the interface. |

#### Scoped user management (C)

| Name | Description |
|---|---|
| ACCT CREATION | As a business analyst, I can create end-user accounts and grant them access to my applications. |
| ACCT MANAGEMENT | As a business analyst, I cannot see or manage the users or applications of another analyst. |

#### Visual schema builder and extras (E)

| Name | Description |
|---|---|
| BUILD | As a business analyst, I can build my schema by adding fields in a guided form instead of writing JSON. |
| ACCT MANAGEMENT | As a business analyst, I can export and import records as CSV. |

#### Generated CRUD interface (E)

| Name | Description |
|---|---|
| CRUD | As an end user, I can edit, and delete records through generated forms so that I can manage my team's data. |
| SEARCH | As an end user, I can search and sort the record list so that I can find data quickly. |

## Project Schedule:

Create a rough project schedule broken down by sprint. For each sprint list the milestones you will meet. This is a rough guideline for future planning, you will make a more detailed plan at the first of each sprint. You will not be held accountable to this schedule as it will likely change as the class progresses.

| Sprint | Milestone(s) |
|---|---|
| 1 | Project scaffolding: Next.js app, Prisma and Postgres, GitHub repository with pull request workflow, deploy pipeline to Vercel. Auth.js login with the three account tiers. Core data model (applications, schemas, records as JSONB). Walking skeleton: one hardcoded schema renders a form and saves a record end to end. |
| 2 | Schema-driven renderer complete: all field types, required and option-list validation, clear error states. Business analysts can create, edit, and publish applications from JSON, with schema validation feedback. |
| 3 | Authorization layer: custom role builder, server-side permission enforcement on every action, scoped user management for business analysts, admin console for managing analyst accounts. |
| 4 | Polish, demo seed applications, final deployment. Stretch goals if time permits: visual schema builder, CSV import/export, per-app theming. |

# Project Architecture

Describe the architecture of your application (For example: web, mobile, client-server, n-tier, etc.).

Blueprint is a web application with a client-server, three-tier architecture delivered from a single Next.js codebase. The presentation tier is server-rendered React (App Router) with client components where interactivity requires them. The application tier is Next.js Server Actions, which handle all mutations and enforce authentication and per-app authorization on the server. The data tier is PostgreSQL accessed through Prisma: application and schema definitions are relational rows, while end-user records are stored as JSONB documents, so analyst-created apps never alter the database schema. The system is multi-tenant, with every query scoped to the owning business analyst's workspace. Hosting is Vercel with a managed Postgres instance.

# Technology

Describe the technology you anticipate using (For example: programming languages, platforms, databases, etc.).

1. Next.js (App Router) with React and TypeScript, using Server Actions for data mutations and serving both the front end and the API layer from a single codebase
2. PostgreSQL with Prisma ORM; dynamic app records are stored as JSONB so new applications require no database migrations
3. Auth.js for session-based authentication, with role and permission checks enforced in a shared authorization layer
4. Tailwind CSS with accessible component primitives (Radix UI); automated accessibility checks with axe-core plus manual keyboard and screen reader testing
5. GitHub for source control and pull request review; deployment on Vercel with a hosted Postgres instance
