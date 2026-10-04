"use client";

import { useActionState, useState } from "react";
import { createAnalyst, type CreateAnalystState } from "@/app/actions/admin";

const initialState: CreateAnalystState = {};

export function CreateAnalystForm() {
  const [state, formAction, pending] = useActionState(createAnalyst, initialState);
  // Controlled so a validation error does not wipe what was typed.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Clear the fields once per successful result, without an effect.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.success) {
      setName("");
      setEmail("");
    }
  }

  const messageId = state.error ? "create-analyst-error" : state.success ? "create-analyst-success" : undefined;

  return (
    <form action={formAction} className="card mt-6 max-w-md space-y-5" aria-describedby={messageId}>
      {state.error && (
        <p id="create-analyst-error" role="alert" className="notice bg-danger-soft font-medium text-danger">
          {state.error}
        </p>
      )}

      {state.success && state.name && (
        <p id="create-analyst-success" role="status" className="notice notice-info font-medium">
          Analyst account created for {state.name}.
        </p>
      )}

      <div>
        <label htmlFor="analyst-name" className="label">
          Name
        </label>
        <input
          id="analyst-name"
          name="name"
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="analyst-email" className="label">
          Email
        </label>
        <input
          id="analyst-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="analyst-password" className="label">
          Temporary password
        </label>
        <input
          id="analyst-password"
          name="temporaryPassword"
          type="password"
          required
          autoComplete="new-password"
          aria-describedby="analyst-password-hint"
          className="input"
        />
        <p id="analyst-password-hint" className="field-hint">
          Must be at least 12 characters. Give this temporary password directly to the analyst.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create analyst"}
      </button>
    </form>
  );
}
