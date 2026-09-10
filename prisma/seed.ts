// Seeds a local database with one account per tier plus a sample application.
// Run with `npm run db:seed`. Safe to re-run: everything is upserted.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { AppSchema } from "../src/lib/schema/app-schema";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const password = process.env.SEED_PASSWORD ?? "password123";

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

async function main() {
  const admin = await upsertUser({ email: "admin@blueprint.local", name: "Ada Admin", role: "ADMIN" });
  const analyst = await upsertUser({ email: "analyst@blueprint.local", name: "Bao Analyst", role: "ANALYST" });
  const endUser = await upsertUser({
    email: "user@blueprint.local",
    name: "Casey User",
    role: "END_USER",
    managedById: analyst.id,
  });

  const app = await db.application.upsert({
    where: { ownerId_slug: { ownerId: analyst.id, slug: "bug-reports" } },
    update: { schema: bugReportSchema, published: true },
    create: {
      ownerId: analyst.id,
      name: "Bug Reports",
      slug: "bug-reports",
      description: "Track defects reported by the QA team.",
      schema: bugReportSchema,
      published: true,
    },
  });

  await db.appMembership.upsert({
    where: { userId_applicationId: { userId: endUser.id, applicationId: app.id } },
    update: {},
    create: { userId: endUser.id, applicationId: app.id },
  });

  const existing = await db.dataRecord.count({ where: { applicationId: app.id } });
  if (existing === 0) {
    await db.dataRecord.createMany({
      data: [
        {
          applicationId: app.id,
          createdById: endUser.id,
          data: {
            title: "Save button does nothing on Safari",
            severity: "High",
            description: "Clicking Save on the profile page has no effect in Safari 17.",
            reproducible: true,
            reported_on: "2026-09-01",
          },
        },
        {
          applicationId: app.id,
          createdById: endUser.id,
          data: {
            title: "Typo on the welcome banner",
            severity: "Low",
            description: "\"Welcom\" should be \"Welcome\".",
            reproducible: true,
            reported_on: "2026-09-03",
          },
        },
      ],
    });
  }

  console.log("Seeded. Sign in with any of these (password: %s):", password);
  console.log("  %s (admin)", admin.email);
  console.log("  %s (business analyst)", analyst.email);
  console.log("  %s (end user)", endUser.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
