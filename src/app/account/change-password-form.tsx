"use client";

// Modelled on src/app/sign-in/sign-in-form.tsx: a client component so
// useActionState can hold the server action's reply and the pending flag.
import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/actions/account";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  // Only ever one message, so one id is enough to point the form's
  // aria-describedby at whichever is showing.
  const messageId = state.error
    ? "change-password-error"
    : state.success
      ? "change-password-success"
      : undefined;

  return (
    <form action={formAction} className="card space-y-5" aria-describedby={messageId}>
      {/* role="alert" interrupts a screen reader immediately, which is right
          for a failure the user has to act on. */}
      {state.error && (
        <p
          id="change-password-error"
          role="alert"
          className="rounded-md bg-danger-soft p-3 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      )}
      {/* role="status" is the polite counterpart: announced when the user
          pauses, because success does not need to cut them off. */}
      {state.success && (
        <p
          id="change-password-success"
          role="status"
          className="notice notice-info font-medium"
        >
          Your password has been changed.
        </p>
      )}

      <div>
        <label htmlFor="currentPassword" className="label">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="label">
          New password
        </label>
        {/* No minLength attribute on purpose. The browser would block the
            submit with its own tooltip, and the server's specific message
            would never be seen or announced. */}
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-describedby="new-password-hint"
          className="input"
        />
        <p id="new-password-hint" className="field-hint">
          Must be at least 12 characters.
        </p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="label">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="input"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
