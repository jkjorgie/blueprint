"use client";

import { useActionState, useState } from "react";
import { createEndUser, type UserFormState } from "@/app/actions/users";

const initial: UserFormState = {};

export function CreateEndUserForm() {
  const [state, formAction, pending] = useActionState(createEndUser, initial);
  // Controlled so a validation error does not wipe the typed name and email.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const messageId = state.error ? "create-user-error" : undefined;

  return (
    <form action={formAction} className="card space-y-5" aria-describedby={messageId}>
      {state.error && (
        <p id="create-user-error" role="alert" className="notice font-medium" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="new-user-name" className="label">
          Name
        </label>
        <input id="new-user-name" name="name" type="text" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="new-user-email" className="label">
          Email
        </label>
        <input id="new-user-email" name="email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="new-user-password" className="label">
          Temporary password
        </label>
        <input id="new-user-password" name="temporaryPassword" type="password" required autoComplete="new-password" aria-describedby="new-user-password-hint" className="input" />
        <p id="new-user-password-hint" className="field-hint">
          At least 12 characters. Share it with the user directly; they can change it from their Account page.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
