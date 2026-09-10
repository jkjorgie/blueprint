"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/app/actions/auth";

const initialState: SignInState = {};

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const errorId = state.error ? "sign-in-error" : undefined;

  return (
    <form action={formAction} className="card space-y-5" aria-describedby={errorId}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.error && (
        <p id="sign-in-error" role="alert" className="rounded-md bg-danger-soft p-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
