"use client";

// Role name plus the permission checkboxes; shared by the add and edit forms.

import { useActionState } from "react";
import type { RoleFormState } from "@/app/actions/roles";
import { ROLE_PERMISSIONS } from "@/lib/schema/role-form";

export type RoleFormValues = {
  name: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  allResponses: boolean;
};

export function RoleForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (previous: RoleFormState, formData: FormData) => Promise<RoleFormState>;
  defaultValues: RoleFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as RoleFormState);

  return (
    <form action={formAction} className="card space-y-5">
      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="role-name" className="label">
          Role name
        </label>
        <input
          id="role-name"
          name="name"
          type="text"
          required
          maxLength={40}
          defaultValue={defaultValues.name}
          className="input"
        />
      </div>
      <fieldset>
        <legend className="label">Permissions</legend>
        <ul className="space-y-2">
          {ROLE_PERMISSIONS.map((p) => (
            <li key={p.key} className="flex items-start gap-2">
              <input
                id={`role-${p.key}`}
                name={p.key}
                type="checkbox"
                defaultChecked={defaultValues[p.key]}
                aria-describedby={`role-${p.key}-hint`}
                className="mt-1 size-4 rounded border-input-border"
              />
              <div>
                <label htmlFor={`role-${p.key}`} className="text-sm font-medium text-ink">
                  {p.label}
                </label>
                <p id={`role-${p.key}-hint`} className="field-hint mt-0">
                  {p.hint}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </fieldset>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
