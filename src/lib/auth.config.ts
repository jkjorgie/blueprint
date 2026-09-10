// The part of the Auth.js config that is safe to import from proxy.ts.
// It must not import the database: the full config with the Credentials
// provider lives in auth.ts.
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

export const authConfig = {
  // We run behind Vercel or a local server, not a fixed public URL.
  trustHost: true,
  pages: { signIn: "/sign-in" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Copy id and role onto the token when the user first signs in.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Expose them on the session object used by auth() and useSession().
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
