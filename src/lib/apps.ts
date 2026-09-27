// Loads an application only if the given user may see it: the owner, or a
// member of a published, unarchived app whose role allows viewing. Returns null
// otherwise, and hands back the user's permissions so pages and actions can
// enforce them without a second query.
import "server-only";
import { db } from "@/lib/db";
import { parseAppSchema, type AppSchema } from "@/lib/schema/app-schema";
import type { CurrentUser } from "@/lib/session";
import { permissionsFor, type Permissions } from "@/lib/permissions";

export type AppForUser = {
  id: string;
  name: string;
  description: string | null;
  published: boolean;
  archived: boolean;
  customCss: string | null;
  ownerId: string;
  schema: AppSchema;
  isOwner: boolean;
  permissions: Permissions;
};

export async function getAppForUser(appId: string, user: CurrentUser): Promise<AppForUser | null> {
  const app = await db.application.findFirst({
    where: {
      id: appId,
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } }, published: true, archivedAt: null }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      published: true,
      archivedAt: true,
      customCss: true,
      ownerId: true,
      schema: true,
      members: {
        where: { userId: user.id },
        select: { role: { select: { canView: true, canCreate: true, canEdit: true, canDelete: true, allResponses: true } } },
      },
    },
  });
  if (!app) return null;

  const { archivedAt, members, ...rest } = app;
  const isOwner = app.ownerId === user.id;
  const permissions = permissionsFor({ isOwner, membership: members[0] ?? null });
  // A role can withhold view. Treat that like no membership at all.
  if (!permissions.view) return null;

  const parsed = parseAppSchema(app.schema);
  if (!parsed.ok) {
    throw new Error(`Application ${app.id} has an invalid stored schema: ${parsed.errors.join("; ")}`);
  }

  return { ...rest, schema: parsed.schema, archived: archivedAt !== null, isOwner, permissions };
}
