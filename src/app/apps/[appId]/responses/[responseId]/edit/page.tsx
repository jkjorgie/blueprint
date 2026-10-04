import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { SchemaForm, type DefaultValues } from "@/components/schema-form/schema-form";
import { updateRecord } from "@/app/actions/records";

export const metadata: Metadata = { title: "Edit response" };

type Props = {
  params: Promise<{
    appId: string;
    responseId: string;
  }>;
};

// The generated form, pre-filled with an existing response.
export default async function EditResponsePage({ params }: Props) {
  const { appId, responseId } = await params;

  const user = await requireUser();
  const app = await getAppForUser(appId, user);

  if (!app) notFound();
  if (app.archived) notFound();
  if (!app.permissions.edit) notFound();

  const record = await db.dataRecord.findFirst({
    where: {
      id: responseId,
      applicationId: app.id,
      ...(app.permissions.scope === "own" ? { createdById: user.id } : {}),
    },
    select: {
      id: true,
      data: true,
    },
  });

  if (!record) notFound();

  const defaultValues = record.data as DefaultValues;

  const action = updateRecord.bind(null, app.id, record.id);

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">Edit response</h1>

      <div className="mt-3">
        <Link href={`/apps/${app.id}/responses`} className="btn btn-secondary">
          Back to responses
        </Link>
      </div>

      <div className="mt-8 max-w-2xl">
        <SchemaForm schema={app.schema} defaultValues={defaultValues} action={action} />
      </div>
    </div>
  );
}
