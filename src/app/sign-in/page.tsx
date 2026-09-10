import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl">Sign in</h1>
        <p className="mt-2 mb-8 text-ink-muted">Use the account your administrator or analyst gave you.</p>
        <SignInForm callbackUrl={callbackUrl ?? "/dashboard"} />
      </div>
    </div>
  );
}
