import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  // Any signed-in role may change their own password, so no role list here.
  // requireUser still redirects a signed-out visitor to sign-in, which makes
  // this page safe even if the proxy matcher is ever edited.
  const user = await requireUser();

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl">Account</h1>
      <p className="mt-2 text-ink-muted">
        Signed in as <strong className="text-ink">{user.email}</strong>
      </p>

      <div className="mt-8 max-w-md">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
