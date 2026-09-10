"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type SignInState = { error?: string };

// Only allow redirects back into this site.
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}

export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // signIn redirects by throwing; anything else must propagate.
    throw err;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
