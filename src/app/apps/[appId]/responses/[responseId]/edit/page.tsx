import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { SchemaForm } from "@/components/schema-form/schema-form";
import { updateRecord } from "@/app/actions/records";

type Props = {
    params: Promise<{
    appId: string;
    responseId: string;
    }>;
};

type DefaultValues = Record<string, string | number | boolean | undefined>;

export default async function EditResponsePage({ params }: Props) {
    const { appId, responseId } = await params;

    const user = await requireUser();
    const app = await getAppForUser(appId, user);

    if (!app) notFound();

    const record = await db.dataRecord.findFirst({
    where: {
        id: responseId,
        applicationId: app.id,
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
        <Link
            href={`/apps/${app.id}/responses`}
            className="btn btn-secondary"
        >
            Back to responses
        </Link>
        </div>

        <div className="mt-8 max-w-2xl">
        <SchemaForm
            schema={app.schema}
            defaultValues={defaultValues}
            action={action}
        />
        </div>
    </div>
    );
}