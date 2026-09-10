// Runs before every matched request. This is only an optimistic check on the
// session cookie; real authorization happens in src/lib/session.ts and in each
// server action.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  if (request.auth) return;

  const signInUrl = new URL("/sign-in", request.nextUrl);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return Response.redirect(signInUrl);
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/apps/:path*"],
};
