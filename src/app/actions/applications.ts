"use server";

// Analysts create, edit, publish, and unpublish their own applications.
// Every action re-checks the role and the ownership on the server; the UI
// hiding a button is never the gate.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  parseApplicationForm,
  readApplicationForm,
  type ApplicationFormState,
} from "@/lib/schema/application-form";

const SLUG_TAKEN = "You already have an application with this slug.";

export async function createApplication(
  _previous: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const user = await requireUser(["ANALYST"]);
  const values = readApplicationForm(formData);
  const parsed = parseApplicationForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };

  const clash = await db.application.findUnique({
    where: { ownerId_slug: { ownerId: user.id, slug: parsed.data.slug } },
    select: { id: true },
  });
  if (clash) return { errors: { slug: SLUG_TAKEN }, values };

  const app = await db.application.create({
    data: { ownerId: user.id, ...parsed.data },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  redirect(`/apps/${app.id}`);
}

export async function updateApplication(
  applicationId: string,
  _previous: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const user = await requireUser(["ANALYST"]);
  const values = readApplicationForm(formData);

  const owned = await db.application.findFirst({
    where: { id: applicationId, ownerId: user.id },
    select: { id: true },
  });
  if (!owned) return { formError: "This application does not exist or is not yours.", values };

  const parsed = parseApplicationForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };

  const clash = await db.application.findFirst({
    where: { ownerId: user.id, slug: parsed.data.slug, NOT: { id: applicationId } },
    select: { id: true },
  });
  if (clash) return { errors: { slug: SLUG_TAKEN }, values };

  await db.application.update({ where: { id: applicationId }, data: parsed.data });

  revalidatePath("/dashboard");
  revalidatePath(`/apps/${applicationId}`);
  revalidatePath(`/apps/${applicationId}/responses`);
  redirect(`/apps/${applicationId}/edit?saved=1`);
}

async function setPublished(applicationId: string, published: boolean) {
  const user = await requireUser(["ANALYST"]);
  const result = await db.application.updateMany({
    where: { id: applicationId, ownerId: user.id },
    data: { published },
  });
  // updateMany with an ownership filter is one round trip and cannot touch a
  // row the analyst does not own. Zero rows means not theirs or not there.
  if (result.count === 0) redirect("/dashboard");

  revalidatePath("/dashboard");
  revalidatePath(`/apps/${applicationId}`);
  redirect(`/apps/${applicationId}/edit?${published ? "published" : "unpublished"}=1`);
}

// Bound in the edit page as publishApplication.bind(null, app.id) and used as a
// plain <form action>, so they take no form data.
export async function publishApplication(applicationId: string) {
  await setPublished(applicationId, true);
}

export async function unpublishApplication(applicationId: string) {
  await setPublished(applicationId, false);
}

// Deleting is only allowed for a draft with no responses, and the whole rule
// is expressed in the delete's own where clause, so a response arriving in
// the same instant cannot be swept away with the app.
export async function deleteApplication(applicationId: string) {
  const user = await requireUser(["ANALYST"]);
  const result = await db.application.deleteMany({
    where: { id: applicationId, ownerId: user.id, published: false, records: { none: {} } },
  });
  if (result.count === 0) redirect(`/apps/${applicationId}/edit?blocked=delete`);

  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}

// Archiving is for drafts that already have responses: the data stays, the
// app stops accepting responses, and members no longer see it.
export async function archiveApplication(applicationId: string) {
  const user = await requireUser(["ANALYST"]);
  const result = await db.application.updateMany({
    where: { id: applicationId, ownerId: user.id, published: false, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (result.count === 0) redirect(`/apps/${applicationId}/edit?blocked=archive`);

  revalidatePath("/dashboard");
  revalidatePath(`/apps/${applicationId}`);
  redirect("/dashboard?archived=1");
}

// Brings an archived app back as a draft.
export async function restoreApplication(applicationId: string) {
  const user = await requireUser(["ANALYST"]);
  const result = await db.application.updateMany({
    where: { id: applicationId, ownerId: user.id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (result.count === 0) redirect("/dashboard");

  revalidatePath("/dashboard");
  revalidatePath(`/apps/${applicationId}`);
  redirect(`/apps/${applicationId}/edit?restored=1`);
}
