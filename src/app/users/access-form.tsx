"use client";

// One user's access to each of the analyst's applications: a member checkbox
// and a role select per application, saved together.
import { useActionState } from "react";
import { saveUserAccess, type UserFormState } from "@/app/actions/users";

export type AccessApp = {
  id: string;
  name: string;
  roles: { id: string; name: string }[];
  membership: { roleId: string | null } | null;
};

const initial: UserFormState = {};

export function AccessForm({ userId, userName, apps }: { userId: string; userName: string; apps: AccessApp[] }) {
  const [state, formAction, pending] = useActionState(saveUserAccess.bind(null, userId), initial);
  const idBase = `access-${userId}`;

  if (apps.length === 0) {
    return <p className="text-sm text-ink-muted">Create an application first, then grant access here.</p>;
  }

  return (
    <form action={formAction} aria-labelledby={`${idBase}-heading`} className="space-y-3">
      <h4 id={`${idBase}-heading`} className="sr-only">
        Application access for {userName}
      </h4>
      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm font-medium text-success">
          Access saved.
        </p>
      )}
      <ul className="space-y-2">
        {apps.map((app) => {
          const checkboxId = `${idBase}-member-${app.id}`;
          const selectId = `${idBase}-role-${app.id}`;
          return (
            <li key={app.id} className="flex flex-wrap items-center gap-3">
              <label htmlFor={checkboxId} className="flex items-center gap-2 text-sm">
                <input
                  id={checkboxId}
                  name={`member-${app.id}`}
                  type="checkbox"
                  defaultChecked={app.membership !== null}
                  className="size-4 rounded border-input-border"
                />
                {app.name}
              </label>
              <label htmlFor={selectId} className="sr-only">
                Role for {app.name}
              </label>
              <select
                id={selectId}
                name={`role-${app.id}`}
                defaultValue={app.membership?.roleId ?? ""}
                className="input w-auto py-1 text-sm"
              >
                <option value="">Default (own responses: view and create)</option>
                {app.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        {pending ? "Saving…" : "Save access"}
      </button>
    </form>
  );
}
