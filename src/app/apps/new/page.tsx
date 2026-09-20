import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { createApplication } from "@/app/actions/applications";
import { ApplicationForm } from "@/components/application-form";
import { STARTER_SCHEMA_JSON } from "@/lib/schema/application-form";

export const metadata: Metadata = { title: "New application" };

export default async function NewApplicationPage() {
  await requireUser(["ANALYST"]);

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">New application</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Describe the fields your users will fill in. The application starts as a draft that only you can see;
        publish it from its edit page when it is ready.
      </p>
      <div className="mt-8 max-w-2xl">
        <ApplicationForm
          action={createApplication}
          defaultValues={{ name: "", slug: "", description: "", schemaJson: STARTER_SCHEMA_JSON }}
          submitLabel="Create application"
        />
      </div>
    </div>
  );
}
