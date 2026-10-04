// Demo data: one account per tier and three sample applications.
// Safe to re-run: accounts and apps are upserted, responses only added to an empty app.
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

// The password is only set on create, so re-seeding never resets a changed one.
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

type ResponseData = Record<string, string | number | boolean>;

type SeedRole = {
  name: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  allResponses: boolean;
};

type SeedApp = {
  name: string;
  slug: string;
  description: string;
  schema: AppSchema;
  responses: ResponseData[];
  roles?: SeedRole[];
  memberRole?: string;
};

// Upserts one application with its roles, the end user's membership, and sample responses.
async function seedApp(analystId: string, memberId: string, app: SeedApp) {
  const application = await db.application.upsert({
    where: { ownerId_slug: { ownerId: analystId, slug: app.slug } },
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

  let memberRoleId: string | null = null;
  for (const role of app.roles ?? []) {
    const saved = await db.appRole.upsert({
      where: { applicationId_name: { applicationId: application.id, name: role.name } },
      update: {
        canView: role.canView,
        canCreate: role.canCreate,
        canEdit: role.canEdit,
        canDelete: role.canDelete,
        allResponses: role.allResponses,
      },
      create: { applicationId: application.id, ...role },
    });
    if (role.name === app.memberRole) memberRoleId = saved.id;
  }

  await db.appMembership.upsert({
    where: { userId_applicationId: { userId: memberId, applicationId: application.id } },
    update: { roleId: memberRoleId },
    create: { userId: memberId, applicationId: application.id, roleId: memberRoleId },
  });

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
    roles: [
      { name: "Editor", canView: true, canCreate: true, canEdit: true, canDelete: true, allResponses: true },
      { name: "Viewer", canView: true, canCreate: false, canEdit: false, canDelete: false, allResponses: true },
    ],
    memberRole: "Editor",
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
