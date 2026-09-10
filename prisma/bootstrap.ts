// Creates the first admin account in a fresh database. Run once against
// production, from your own machine:
//
//   DATABASE_URL="<prod session-pooler url>" ADMIN_EMAIL="..." ADMIN_PASSWORD="..." npm run db:bootstrap
//
// Safe to re-run: it updates the password if the account already exists.
// Demo data belongs in seed.ts, not here.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Administrator";

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running db:bootstrap.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash(password!, 10);
  const admin = await db.user.upsert({
    where: { email: email! },
    update: { name, role: "ADMIN", active: true, passwordHash },
    create: { email: email!, name, role: "ADMIN", passwordHash },
  });
  console.log("Admin account ready: %s (%s)", admin.email, admin.name);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
