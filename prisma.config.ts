import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a session-mode connection. Locally DATABASE_URL already
    // is one; on Vercel set DIRECT_URL to the port 5432 pooler and keep
    // DATABASE_URL on the transaction pooler for the running app.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
