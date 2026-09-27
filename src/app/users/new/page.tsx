import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { CreateEndUserForm } from "../create-end-user-form";

export const metadata: Metadata = { title: "New user" };

export default async function NewUserPage() {
  await requireUser(["ANALYST"]);
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">New user</h1>
      <p className="mt-2">
        <Link href="/users" className="btn btn-secondary">
          Back to users
        </Link>
      </p>
      <div className="mt-8 max-w-md">
        <CreateEndUserForm />
      </div>
    </div>
  );
}
