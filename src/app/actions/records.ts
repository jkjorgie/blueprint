"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { parseRecord, rawValues, type RecordFormState } from "@/lib/schema/record-schema";

// Bound in the app page as createRecord.bind(null, app.id) so the form's
// action has the (previousState, formData) shape useActionState expects.
export async function createRecord(
  applicationId: string,
  _previous: RecordFormState,
  formData: FormData,
): Promise<RecordFormState> {
  const user = await requireUser();

  // Owner or member only. Server actions are reachable by direct POST, so this
  // check is the real gate, not the UI.
  const app = await getAppForUser(applicationId, user);
  if (!app) {
    return { formError: "You do not have access to this application." };
  }
  if (app.archived) {
    return { formError: "This application is archived and no longer accepts responses." };
  }

  const result = parseRecord(app.schema, formData);
  if (!result.ok) {
    return { errors: result.errors, values: rawValues(app.schema, formData) };
  }

  await db.dataRecord.create({
    data: { applicationId: app.id, createdById: user.id, data: result.data },
  });

  revalidatePath(`/apps/${app.id}`);
  revalidatePath(`/apps/${app.id}/responses`);
  redirect(`/apps/${app.id}?saved=1`);
}
