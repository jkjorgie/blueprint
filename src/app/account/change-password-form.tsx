"use client";

// Change-password form. Error and success messages come back from the server action.

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/actions/account";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  const messageId = state.error ? "change-password-error" : state.success ? "change-password-success" : undefined;

  return (
    <form action={formAction} className="card space-y-5" aria-describedby={messageId}>
      {state.error && (
        <p
          id="change-password-error"
          role="alert"
          className="rounded-md bg-danger-soft p-3 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p id="change-password-success" role="status" className="notice notice-info font-medium">
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
