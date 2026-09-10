import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import type { Role } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Dashboard" };

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  ANALYST: "Business analyst",
  END_USER: "End user",
};

// What each tier will eventually see here. Replace these with real sections as
// the features land.
const upcoming: Record<Role, string[]> = {
  ADMIN: ["Analyst accounts", "Platform activity"],
  ANALYST: ["My applications", "My end users", "New application from JSON"],
  END_USER: ["Applications I can use", "My recent records"],
};

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">Welcome, {user.name}</h1>
      <p className="mt-2 text-ink-muted">
        You are signed in as <strong className="text-ink">{roleLabels[user.role]}</strong>.
      </p>

      <section aria-labelledby="upcoming-heading" className="mt-10">
        <h2 id="upcoming-heading" className="text-xl">
          Coming to this page
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {upcoming[user.role].map((item) => (
            <li key={item} className="card text-ink-muted">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
