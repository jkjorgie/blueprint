// The part of the Auth.js config that proxy.ts can import: no database access here.
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/sign-in" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
