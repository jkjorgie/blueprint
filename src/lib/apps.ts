// Loads an application only if the given user may see it: the owner, or an
// end user with a membership. Returns null otherwise. Use this at the top of
// every app page so the access rule lives in one place.
import "server-only";
import { db } from "@/lib/db";
import { parseAppSchema, type AppSchema } from "@/lib/schema/app-schema";
import type { CurrentUser } from "@/lib/session";

export type AppForUser = {
  id: string;
  name: string;
  description: string | null;
  published: boolean;
  ownerId: string;
  schema: AppSchema;
  isOwner: boolean;
};

export async function getAppForUser(appId: string, user: CurrentUser): Promise<AppForUser | null> {
  const app = await db.application.findFirst({
    where: {
      id: appId,
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } }, published: true }],
    },
    select: { id: true, name: true, description: true, published: true, ownerId: true, schema: true },
  });
  if (!app) return null;

  const parsed = parseAppSchema(app.schema);
  if (!parsed.ok) {
    throw new Error(`Application ${app.id} has an invalid stored schema: ${parsed.errors.join("; ")}`);
  }

  return { ...app, schema: parsed.schema, isOwner: app.ownerId === user.id };
}
