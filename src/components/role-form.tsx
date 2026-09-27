"use client";

// Name plus four permission checkboxes. Used by the role edit page, and meant
// to be reused by the role builder's add form.
import { useActionState } from "react";
import type { RoleFormState } from "@/app/actions/roles";

export type RoleFormValues = {
  name: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  allResponses: boolean;
};

const PERMISSIONS: { key: keyof Omit<RoleFormValues, "name">; label: string; hint: string }[] = [
  { key: "canView", label: "View", hint: "Open the application and see its responses." },
  { key: "canCreate", label: "Create", hint: "Submit new responses." },
  { key: "canEdit", label: "Edit", hint: "Change existing responses." },
  { key: "canDelete", label: "Delete", hint: "Remove responses." },
  { key: "allResponses", label: "All responses", hint: "Apply these permissions to every response in the application, not only the ones the member submitted." },
];

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
        <input id="role-name" name="name" type="text" required maxLength={40} defaultValue={defaultValues.name} className="input" />
      </div>
      <fieldset>
        <legend className="label">Permissions</legend>
        <ul className="space-y-2">
          {PERMISSIONS.map((p) => (
            <li key={p.key} className="flex items-start gap-2">
              <input id={`role-${p.key}`} name={p.key} type="checkbox" defaultChecked={defaultValues[p.key]} aria-describedby={`role-${p.key}-hint`} className="mt-1 size-4 rounded border-input-border" />
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
