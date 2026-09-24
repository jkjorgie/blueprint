// Seeds a local database with one account per tier plus the demo applications.
// Run with `npm run db:seed`. Safe to re-run: everything is upserted, and
// responses are only created for an application that has none.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { AppSchema } from "../src/lib/schema/app-schema";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const password = process.env.SEED_PASSWORD ?? "blueprint-demo";

const bugReportSchema: AppSchema = {
  title: "Bug Reports",
  fields: [
    { name: "title", label: "Title", type: "text", required: true, maxLength: 120 },
    {
      name: "severity",
      label: "Severity",
      type: "select",
      required: true,
      options: ["Low", "Medium", "High", "Critical"],
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: true,
      helpText: "What happened, and what did you expect to happen?",
    },
    { name: "reproducible", label: "Reproducible every time", type: "boolean", required: false },
    { name: "reported_on", label: "Reported on", type: "date", required: true },
  ],
};

// Carries the `number` type, which Bug Reports does not use, plus a `min`
// constraint so the demo shows a numeric rule being enforced.
const equipmentRequestSchema: AppSchema = {
  title: "Equipment Requests",
  fields: [
    { name: "item", label: "Item", type: "text", required: true, maxLength: 120 },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      min: 1,
      helpText: "How many units are needed. At least one.",
    },
    { name: "needed_by", label: "Needed by", type: "date", required: true },
    {
      name: "urgency",
      label: "Urgency",
      type: "select",
      required: true,
      options: ["Routine", "Soon", "Urgent"],
    },
    {
      name: "justification",
      label: "Justification",
      type: "textarea",
      required: true,
      helpText: "Why this is needed and what it unblocks.",
    },
    { name: "manager_approved", label: "Manager has approved", type: "boolean", required: false },
  ],
};

// Pairs with the above: the same six types, but exercising `max` rather than
// `min` and mostly optional fields, so the two demo forms do not look alike.
const eventRsvpSchema: AppSchema = {
  title: "Event RSVPs",
  fields: [
    { name: "attendee_name", label: "Your name", type: "text", required: true, maxLength: 80 },
    { name: "attending", label: "I will attend", type: "boolean", required: false },
    {
      name: "guests",
      label: "Additional guests",
      type: "number",
      required: false,
      min: 0,
      max: 5,
      helpText: "Up to five guests per person.",
    },
    {
      name: "dietary_needs",
      label: "Dietary needs",
      type: "select",
      required: false,
      options: ["None", "Vegetarian", "Vegan", "Gluten free", "Nut allergy"],
    },
    { name: "notes", label: "Anything else we should know", type: "textarea", required: false },
    { name: "responded_on", label: "Responded on", type: "date", required: true },
  ],
};

async function upsertUser(input: {
  email: string;
  name: string;
  role: "ADMIN" | "ANALYST" | "END_USER";
  managedById?: string;
}) {
  const passwordHash = await bcrypt.hash(password, 10);
  return db.user.upsert({
    where: { email: input.email },
    update: { name: input.name, role: input.role, managedById: input.managedById, active: true },
    create: { ...input, passwordHash },
  });
}

// Values stored in DataRecord.data. Keys must match the schema field names.
type ResponseData = Record<string, string | number | boolean>;

type SeedApp = {
  name: string;
  slug: string;
  description: string;
  schema: AppSchema;
  responses: ResponseData[];
};

// One application, its membership for the end user, and its sample responses.
// Lifted out of the original inline Bug Reports block so all three demo apps
// are created the same way. The behaviour is unchanged.
async function seedApp(analystId: string, memberId: string, app: SeedApp) {
  const application = await db.application.upsert({
    // ownerId + slug is the unique key, so a second run updates this row
    // rather than creating a duplicate application.
    where: { ownerId_slug: { ownerId: analystId, slug: app.slug } },
    // Only the schema and the published flag are refreshed. Leaving name and
    // description alone means an analyst's edits in the running app survive.
    update: { schema: app.schema, published: true },
    create: {
      ownerId: analystId,
      name: app.name,
      slug: app.slug,
      description: app.description,
      schema: app.schema,
      published: true,
    },
  });

  await db.appMembership.upsert({
    where: { userId_applicationId: { userId: memberId, applicationId: application.id } },
    update: {},
    create: { userId: memberId, applicationId: application.id },
  });

  // Responses have no natural unique key, so they cannot be upserted. Creating
  // them only when the application has none is what stops a second run from
  // doubling the demo data.
  const existing = await db.dataRecord.count({ where: { applicationId: application.id } });
  if (existing === 0) {
    await db.dataRecord.createMany({
      data: app.responses.map((data) => ({
        applicationId: application.id,
        createdById: memberId,
        data,
      })),
    });
  }

  return { name: app.name, responses: existing === 0 ? app.responses.length : existing };
}

const demoApps: SeedApp[] = [
  {
    name: "Bug Reports",
    slug: "bug-reports",
    description: "Track defects reported by the QA team.",
    schema: bugReportSchema,
    responses: [
      {
        title: "Save button does nothing on Safari",
        severity: "High",
        description: "Clicking Save on the profile page has no effect in Safari 17.",
        reproducible: true,
        reported_on: "2026-09-01",
      },
      {
        title: "Typo on the welcome banner",
        severity: "Low",
        description: '"Welcom" should be "Welcome".',
        reproducible: true,
        reported_on: "2026-09-03",
      },
    ],
  },
  {
    name: "Equipment Requests",
    slug: "equipment-requests",
    description: "Ask the operations team for hardware and supplies.",
    schema: equipmentRequestSchema,
    responses: [
      {
        item: "Standing desk converter",
        quantity: 1,
        needed_by: "2026-10-05",
        urgency: "Routine",
        justification: "Recurring back pain during long review sessions.",
        manager_approved: true,
      },
      {
        item: "USB-C docking station",
        quantity: 3,
        needed_by: "2026-09-28",
        urgency: "Soon",
        justification: "Three new starters join the support rota next sprint.",
        manager_approved: true,
      },
      {
        item: "Replacement laptop charger",
        quantity: 1,
        needed_by: "2026-09-24",
        urgency: "Urgent",
        justification: "The current charger failed and the spare is on loan.",
        manager_approved: false,
      },
    ],
  },
  {
    name: "Event RSVPs",
    slug: "event-rsvps",
    description: "Headcount and dietary needs for the autumn team dinner.",
    schema: eventRsvpSchema,
    responses: [
      {
        attendee_name: "Priya Raman",
        attending: true,
        guests: 1,
        dietary_needs: "Vegetarian",
        notes: "Bringing my partner. Happy to help with setup.",
        responded_on: "2026-09-14",
      },
      {
        attendee_name: "Tom Okafor",
        attending: true,
        guests: 0,
        dietary_needs: "Nut allergy",
        notes: "Severe, so please keep satay off the shared platters.",
        responded_on: "2026-09-15",
      },
      {
        attendee_name: "Lena Fischer",
        attending: false,
        guests: 0,
        dietary_needs: "None",
        notes: "Away that week. Have a good one.",
        responded_on: "2026-09-16",
      },
      {
        attendee_name: "Dana Whitfield",
        attending: true,
        guests: 2,
        dietary_needs: "Gluten free",
        notes: "",
        responded_on: "2026-09-18",
      },
    ],
  },
];

async function main() {
  const admin = await upsertUser({ email: "admin@blueprint.local", name: "Ada Admin", role: "ADMIN" });
  const analyst = await upsertUser({ email: "analyst@blueprint.local", name: "Bao Analyst", role: "ANALYST" });
  const endUser = await upsertUser({
    email: "user@blueprint.local",
    name: "Casey User",
    role: "END_USER",
    managedById: analyst.id,
  });

  // Sequential rather than in parallel: these share one pooled connection, and
  // a readable log matters more here than a few milliseconds.
  const seeded = [];
  for (const app of demoApps) {
    seeded.push(await seedApp(analyst.id, endUser.id, app));
  }

  console.log("Seeded. Sign in with any of these (password: %s):", password);
  console.log("  %s (admin)", admin.email);
  console.log("  %s (business analyst)", analyst.email);
  console.log("  %s (end user)", endUser.email);
  console.log("Applications:");
  for (const app of seeded) {
    console.log("  %s (%d responses)", app.name, app.responses);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
