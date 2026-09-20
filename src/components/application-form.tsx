"use client";

// The form analysts use to create or edit an application. Shared by the new
// and edit pages; the server action passed in decides which one it is.
//
// All four fields are controlled, so nothing the analyst typed is lost when
// the action comes back with errors, and the slug can follow the name until
// the analyst edits it by hand.

import { useActionState, useEffect, useRef, useState } from "react";
import {
  slugify,
  type ApplicationFormState,
  type ApplicationFormValues,
} from "@/lib/schema/application-form";

export type ApplicationFormAction = (
  previous: ApplicationFormState,
  formData: FormData,
) => Promise<ApplicationFormState>;

type Props = {
  action: ApplicationFormAction;
  defaultValues: ApplicationFormValues;
  submitLabel: string;
  // On the edit page the slug already exists; stop suggesting it from the name.
  slugFollowsName?: boolean;
};

const EMPTY: ApplicationFormState = {};

export function ApplicationForm({ action, defaultValues, submitLabel, slugFollowsName = true }: Props) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const [name, setName] = useState(defaultValues.name);
  const [slug, setSlug] = useState(defaultValues.slug);
  const [slugTouched, setSlugTouched] = useState(!slugFollowsName);
  const [description, setDescription] = useState(defaultValues.description);
  const [schemaJson, setSchemaJson] = useState(defaultValues.schemaJson);
  const summaryRef = useRef<HTMLDivElement>(null);

  const errors = state.errors ?? {};
  const problems: { id: string; message: string }[] = [
    ...(errors.name ? [{ id: "app-name", message: errors.name }] : []),
    ...(errors.slug ? [{ id: "app-slug", message: errors.slug }] : []),
    ...(errors.description ? [{ id: "app-description", message: errors.description }] : []),
    ...(errors.schema ?? []).map((message) => ({ id: "app-schema", message })),
  ];
  const hasErrors = problems.length > 0 || Boolean(state.formError);

  useEffect(() => {
    if (hasErrors) summaryRef.current?.focus();
  }, [hasErrors, state]);

  const describe = (...ids: (string | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

  return (
    <form action={formAction} noValidate className="space-y-6">
      {hasErrors && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="app-form-summary"
          className="rounded-md border border-danger bg-danger-soft p-4"
        >
          <h2 id="app-form-summary" className="text-base font-semibold text-danger">
            {state.formError ?? `Please fix ${problems.length} ${problems.length === 1 ? "problem" : "problems"}`}
          </h2>
          {problems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-danger">
              {problems.map((p, i) => (
                <li key={i}>
                  <a href={`#${p.id}`} className="underline">
                    {p.message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label htmlFor="app-name" className="label">
          Name
        </label>
        <input
          id="app-name"
          name="name"
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describe(errors.name && "app-name-error")}
          className="input"
        />
        {errors.name && (
          <p id="app-name-error" className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="app-slug" className="label">
          Slug
        </label>
        <input
          id="app-slug"
          name="slug"
          type="text"
          required
          maxLength={60}
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          aria-invalid={errors.slug ? true : undefined}
          aria-describedby={describe("app-slug-hint", errors.slug && "app-slug-error")}
          className="input font-mono"
        />
        <p id="app-slug-hint" className="field-hint">
          A short identifier: lowercase letters, numbers, and hyphens. Suggested from the name until you change it.
        </p>
        {errors.slug && (
          <p id="app-slug-error" className="field-error">
            {errors.slug}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="app-description" className="label">
          Description
        </label>
        <textarea
          id="app-description"
          name="description"
          rows={2}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describe("app-description-hint", errors.description && "app-description-error")}
          className="input"
        />
        <p id="app-description-hint" className="field-hint">
          Optional. Shown to your users on their dashboard.
        </p>
        {errors.description && (
          <p id="app-description-error" className="field-error">
            {errors.description}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="app-schema" className="label">
          Fields (JSON)
        </label>
        <textarea
          id="app-schema"
          name="schemaJson"
          rows={18}
          spellCheck={false}
          value={schemaJson}
          onChange={(e) => setSchemaJson(e.target.value)}
          aria-invalid={errors.schema ? true : undefined}
          aria-describedby={describe("app-schema-hint", errors.schema && "app-schema-error")}
          className="input font-mono text-sm"
        />
        <p id="app-schema-hint" className="field-hint">
          A title and a list of fields. Field types: text, textarea, number, boolean, date, select. Each field needs a
          name (lowercase, no spaces), a label, and a type; select fields need options.
        </p>
        {errors.schema && (
          <ul id="app-schema-error" className="field-error list-disc pl-5">
            {errors.schema.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
