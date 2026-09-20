// Lists the records submitted to one application.
//
// Access is decided entirely by getAppForUser: it returns the app only for the
// owner or a member of a published app, and null otherwise. Turning that null
// into notFound() means a stranger cannot tell an app they may not see from one
// that does not exist.
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getAppForUser } from "@/lib/apps";
import { RecordsTable } from "@/components/records-table";

// In Next.js 16 route params arrive as a Promise and have to be awaited.
type Props = { params: Promise<{ appId: string }> };

export default async function RecordsPage({ params }: Props) {
  const { appId } = await params;

  // Order matters: establish who the user is before loading anything, so the
  // access check below has a verified identity to work with.
  const user = await requireUser();
  const app = await getAppForUser(appId, user);
  if (!app) notFound();

  // Only reached once access is settled, so this query cannot leak another
  // application's records.
  const records = await db.dataRecord.findMany({
    where: { applicationId: app.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, data: true, createdAt: true },
  });

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">{app.name}: records</h1>
      <div className="mt-8">
        {/* app.schema is already parsed and validated by getAppForUser, so the
            table can trust its shape without re-checking it. */}
        <RecordsTable schema={app.schema} records={records} />
      </div>
    </div>
  );
}
