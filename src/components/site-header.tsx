import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

// Reads the session token only (no database call) so it is cheap to render in
// the root layout. Pages that need a verified user use src/lib/session.ts.
export async function SiteHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <header className="border-b border-line bg-surface">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Link href="/" className="text-lg font-semibold text-ink no-underline">
          Blueprint
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-4">
            {signedIn ? (
              <>
                <li>
                  <Link href="/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <form action={signOutAction}>
                    <button type="submit" className="btn btn-secondary">
                      Sign out
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <li>
                <Link href="/sign-in" className="btn btn-primary">
                  Sign in
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
