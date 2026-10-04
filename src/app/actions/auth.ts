"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type SignInState = { error?: string };

// Only allow redirects back into this site.
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}

// A wrong password and a server fault get different messages; the fault is logged.
export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
    return {};
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return { error: "Invalid email or password." };
    }
    if (err instanceof AuthError) {
      console.error("[sign-in] %s: %s", err.type, err.cause?.err?.message ?? err.message);
      return { error: "Sign-in is unavailable right now. Please try again later." };
    }
    // signIn redirects by throwing, so anything that is not an AuthError must propagate.
    throw err;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
