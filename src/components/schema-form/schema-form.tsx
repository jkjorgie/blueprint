"use client";

// Renders a form from an application's schema: one labeled control per field,
// help text and error messages connected with aria-describedby, and an error
// summary that receives focus after a failed submit.
//
// The `action` is a server action with the useActionState signature. It
// validates with parseRecord() and returns a RecordFormState.
//
// Every control is controlled by React state, and the action is dispatched
// from onSubmit inside a transition rather than through the form's action
// prop. React resets a form after an action that was invoked by submission,
// and that reset cleared selects and checkboxes even when controlled. Calling
// the action ourselves skips the reset, so a failed submit changes nothing the
// user typed. The action prop stays on the form so it still submits without
// JavaScript.

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import type { AppSchema, Field } from "@/lib/schema/app-schema";
import type { RecordFormState } from "@/lib/schema/record-schema";

export type { RecordFormState };

export type SchemaFormAction = (previous: RecordFormState, formData: FormData) => Promise<RecordFormState>;

type DefaultValues = Record<string, string | number | boolean | undefined>;
type FormValues = Record<string, string | boolean>;

function initialValues(schema: AppSchema, defaults?: DefaultValues): FormValues {
  const values: FormValues = {};
  for (const field of schema.fields) {
    const raw = defaults?.[field.name];
    if (field.type === "boolean") {
      values[field.name] = raw === true || raw === "on" || raw === "true";
    } else {
      values[field.name] = raw === undefined || raw === null ? "" : String(raw);
    }
  }
  return values;
}

type Props = {
  schema: AppSchema;
  action: SchemaFormAction;
  defaultValues?: DefaultValues;
  submitLabel?: string;
};

const EMPTY_STATE: RecordFormState = {};

export function SchemaForm({ schema, action, defaultValues, submitLabel = "Save" }: Props) {
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  const [values, setValues] = useState<FormValues>(() => initialValues(schema, defaultValues));
  const formId = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const setValue = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));

  const errors = state.errors ?? {};
  const errorFields = schema.fields.filter((field) => errors[field.name]);
  const hasErrors = errorFields.length > 0 || Boolean(state.formError);

  // Move focus to the summary so keyboard and screen reader users hear what went wrong.
  useEffect(() => {
    if (hasErrors) summaryRef.current?.focus();
  }, [hasErrors, state]);

  const idFor = (field: Field) => `${formId}-${field.name}`;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      noValidate
      className="space-y-5"
    >
      {hasErrors && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby={`${formId}-summary-heading`}
          className="rounded-md border border-danger bg-danger-soft p-4"
        >
          <h2 id={`${formId}-summary-heading`} className="text-base font-semibold text-danger">
            {state.formError ?? `Please fix ${errorFields.length} ${errorFields.length === 1 ? "field" : "fields"}`}
          </h2>
          {errorFields.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-danger">
              {errorFields.map((field) => (
                <li key={field.name}>
                  <a href={`#${idFor(field)}`} className="underline">
                    {errors[field.name]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {schema.fields.map((field) => (
        <SchemaField
          key={field.name}
          field={field}
          id={idFor(field)}
          error={errors[field.name]}
          value={values[field.name]}
          onChange={(value) => setValue(field.name, value)}
        />
      ))}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

type FieldProps = {
  field: Field;
  id: string;
  error?: string;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
};

function SchemaField({ field, id, error, value, onChange }: FieldProps) {
  const hintId = field.helpText ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const common = {
    id,
    name: field.name,
    required: field.required,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  };

  const text = typeof value === "string" ? value : "";
  const onText = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value);

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = <textarea {...common} rows={4} value={text} onChange={onText} className="input" />;
      break;
    case "number":
      control = (
        <input {...common} type="number" value={text} onChange={onText} min={field.min} max={field.max} step="any" className="input" />
      );
      break;
    case "date":
      control = <input {...common} type="date" value={text} onChange={onText} className="input" />;
      break;
    case "select":
      control = (
        <select {...common} value={text} onChange={onText} className="input">
          <option value="">Select…</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
      break;
    case "boolean":
      control = (
        <input
          {...common}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-line"
        />
      );
      break;
    default:
      control = <input {...common} type="text" value={text} onChange={onText} maxLength={field.maxLength} className="input" />;
  }

  const label = (
    <label htmlFor={id} className={field.type === "boolean" ? "text-sm font-medium text-ink" : "label"}>
      {field.label}
      {field.required && (
        <span className="text-danger" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );

  return (
    <div>
      {field.type === "boolean" ? (
        <div className="flex items-center gap-2">
          {control}
          {label}
        </div>
      ) : (
        <>
          {label}
          {control}
        </>
      )}
      {field.helpText && (
        <p id={hintId} className="field-hint">
          {field.helpText}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
