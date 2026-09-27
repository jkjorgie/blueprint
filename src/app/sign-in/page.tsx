import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { signOutAction } from "@/app/actions/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  // getCurrentUser re-checks the database, so a deactivated account with a
  // still-valid session token is not sent back to the dashboard, which would
  // only redirect here again.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const session = await auth();
  const deactivated = Boolean(session?.user);
  const { callbackUrl } = await searchParams;

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl">Sign in</h1>
        <p className="mt-2 mb-8 text-ink-muted">Use the account your administrator or analyst gave you.</p>
        {deactivated && (
          <div role="alert" className="notice notice-warning mb-6">
            <p className="font-medium">This account has been deactivated.</p>
            <p className="mt-1">Contact the person who set up your account. You can sign in with a different account below.</p>
            <form action={signOutAction} className="mt-3">
              <button type="submit" className="btn btn-secondary">
                Clear this session
              </button>
            </form>
          </div>
        )}
        <SignInForm callbackUrl={callbackUrl ?? "/dashboard"} />
      </div>
    </div>
  );
}
