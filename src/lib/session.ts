// Data access layer for the signed-in user. Use these in server components,
// server actions, and route handlers instead of calling auth() directly, so
// deactivated accounts are locked out immediately even though their JWT is
// still valid.
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

// Cached per request, so calling it from a layout and a page costs one query.
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

// Redirects to sign-in when there is no valid user, and to the dashboard when
// the user's role is not in `allowed`. Returns the user otherwise.
export async function requireUser(allowed?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (allowed && !allowed.includes(user.role)) redirect("/dashboard");
  return user;
}
