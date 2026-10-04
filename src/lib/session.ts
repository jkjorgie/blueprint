// The signed-in user, re-checked against the database on every request so a deactivated
// account is locked out even though its session token is still valid.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!user || !user.active) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

// Redirects to sign-in without a valid user, or to the dashboard for the wrong role.
export async function requireUser(allowed?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (allowed && !allowed.includes(user.role)) redirect("/dashboard");
  return user;
}
