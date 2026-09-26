import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { deleteRecord } from "@/app/actions/records";

type Props = {
    params: Promise<{
    appId: string;
    responseId: string;
    }>;
};

export default async function DeleteResponsePage({ params }: Props) {
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

    const data = record.data as Record<string, unknown>;
    const firstField = app.schema.fields[0];
    const summaryValue = data[firstField.name];

    return (
    <div className="container-page py-12">
        <h1 className="text-3xl">Delete response</h1>

        <p className="mt-4">
        Are you sure you want to delete this response?
        </p>

        <div className="mt-6 rounded border border-line p-4">
        <p className="font-medium">{firstField.label}</p>
        <p className="mt-1 text-ink-muted">
            {summaryValue === undefined || summaryValue === null
            ? "(No value)"
            : String(summaryValue)}
        </p>
        </div>

        <div className="mt-8 flex gap-3">
        <form action={deleteRecord.bind(null, app.id, record.id)}>
            <button type="submit" className="btn btn-primary">
            Delete response
            </button>
        </form>

        <Link
            href={`/apps/${app.id}/responses`}
            className="btn btn-secondary"
        >
            Cancel
        </Link>
        </div>
    </div>
    );
}
