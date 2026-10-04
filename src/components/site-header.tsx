// Reads only the session token, with no database call, so it is cheap on every page.
import Link from "next/link";
import { auth } from "@/lib/auth";
import { HeaderNav } from "@/components/header-nav";

export async function SiteHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <header className="relative border-b border-line bg-surface">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Link href={signedIn ? "/dashboard" : "/"} className="text-lg font-semibold text-ink no-underline">
          Blueprint
        </Link>
        {signedIn ? (
          <HeaderNav role={session!.user.role} />
        ) : (
          <nav aria-label="Main">
            <Link href="/sign-in" className="btn btn-primary">
              Sign in
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
