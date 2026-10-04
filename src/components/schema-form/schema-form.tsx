"use client";

// Renders a form from an application's schema, including repeating groups.
//
// Controls are held in React state and the action is dispatched from onSubmit inside a
// transition. React resets a form after a submit-invoked action, which cleared selects
// and checkboxes; dispatching it ourselves avoids that.
//
// List rows are named `${list}.${index}.${sub}`, the shape parseRecord() reads back.

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import type { AppSchema, Field, ListField, ScalarField } from "@/lib/schema/app-schema";
import type { RecordFormState } from "@/lib/schema/record-schema";

export type { RecordFormState };

export type SchemaFormAction = (previous: RecordFormState, formData: FormData) => Promise<RecordFormState>;

export type DefaultValues = Record<string, string | number | boolean | undefined | Record<string, unknown>[]>;
type FormValues = Record<string, string | boolean>;

// A stable key per row, so removing a middle row does not shift input state.
type ListRow = { key: string; values: FormValues };
type ListState = { rows: Record<string, ListRow[]>; nextKey: number };

function initialValue(field: ScalarField, raw: unknown): string | boolean {
  if (field.type === "boolean") return raw === true || raw === "on" || raw === "true";
  return raw === undefined || raw === null ? "" : String(raw);
}

function initialValues(schema: AppSchema, defaults?: DefaultValues): FormValues {
  const values: FormValues = {};
  for (const field of schema.fields) {
    if (field.type === "list") continue;
    values[field.name] = initialValue(field, defaults?.[field.name]);
  }
  return values;
}

function rowValues(field: ListField, item: unknown): FormValues {
  const raw = item !== null && typeof item === "object" ? (item as Record<string, unknown>) : {};
  return Object.fromEntries(field.fields.map((sub) => [sub.name, initialValue(sub, raw[sub.name])]));
}

// Stored items when editing, otherwise the minimum number of blank rows.
function initialLists(schema: AppSchema, defaults?: DefaultValues): ListState {
  let nextKey = 0;
  const rows: Record<string, ListRow[]> = {};
  for (const field of schema.fields) {
    if (field.type !== "list") continue;
    const stored = defaults?.[field.name];
    const items = Array.isArray(stored)
      ? stored.map((item) => rowValues(field, item))
      : Array.from({ length: Math.max(field.minItems, field.required ? 1 : 0) }, () => rowValues(field, undefined));
    rows[field.name] = items.map((values) => ({ key: String(nextKey++), values }));
  }
  return { rows, nextKey };
}

// Which rows a submission carried, in order, so the server's row indexes map back to row keys.
function sentRowKeys(schema: AppSchema, rows: ListState["rows"], formData: FormData): Record<string, string[]> {
  const sent: Record<string, string[]> = {};
  for (const field of schema.fields) {
    if (field.type !== "list") continue;
    sent[field.name] = rows[field.name]
      .filter((_, index) => field.fields.some((sub) => formData.has(`${field.name}.${index}.${sub.name}`)))
      .map((row) => row.key);
  }
  return sent;
}

type Props = {
  schema: AppSchema;
  action: SchemaFormAction;
  defaultValues?: DefaultValues;
  submitLabel?: string;
};

const EMPTY_STATE: RecordFormState = {};

type Problem = { key: string; message: string; target: string };

export function SchemaForm({ schema, action, defaultValues, submitLabel = "Save" }: Props) {
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  const [values, setValues] = useState<FormValues>(() => initialValues(schema, defaultValues));
  const [lists, setLists] = useState<ListState>(() => initialLists(schema, defaultValues));
  const [submittedKeys, setSubmittedKeys] = useState<Record<string, string[]>>({});
  const formId = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef<string | null>(null);
  const setValue = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));

  const idFor = (field: Field) => `${formId}-${field.name}`;
  const rowControlId = (field: ListField, rowKey: string, sub: ScalarField) => `${idFor(field)}-${rowKey}-${sub.name}`;
  const addButtonId = (field: ListField) => `${idFor(field)}-add`;

  const errors = state.errors ?? {};

  const rowError = (field: ListField, rowKey: string, sub: ScalarField) => {
    const sent = submittedKeys[field.name] ?? lists.rows[field.name].map((row) => row.key);
    const index = sent.indexOf(rowKey);
    return index === -1 ? undefined : errors[`${field.name}.${index}.${sub.name}`];
  };

  const problems: Problem[] = [];
  for (const field of schema.fields) {
    const message = errors[field.name];
    if (field.type !== "list") {
      if (message) problems.push({ key: field.name, message, target: idFor(field) });
      continue;
    }
    if (message) problems.push({ key: field.name, message, target: addButtonId(field) });
    for (const row of lists.rows[field.name]) {
      for (const sub of field.fields) {
        const rowMessage = rowError(field, row.key, sub);
        if (rowMessage) {
          problems.push({
            key: `${field.name}.${row.key}.${sub.name}`,
            message: rowMessage,
            target: rowControlId(field, row.key, sub),
          });
        }
      }
    }
  }
  const hasErrors = problems.length > 0 || Boolean(state.formError);

  useEffect(() => {
    // Focus the summary so keyboard and screen reader users hear what went wrong.
    if (hasErrors) summaryRef.current?.focus();
  }, [hasErrors, state]);

  useEffect(() => {
    if (!focusAfterRender.current) return;
    document.getElementById(focusAfterRender.current)?.focus();
    focusAfterRender.current = null;
  }, [lists]);

  const setRowValue = (field: ListField, rowKey: string, sub: string, value: string | boolean) =>
    setLists((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        [field.name]: prev.rows[field.name].map((row) =>
          row.key === rowKey ? { ...row, values: { ...row.values, [sub]: value } } : row,
        ),
      },
    }));

  // After Add or Remove, focus moves to where the user can carry on.
  const addRow = (field: ListField) => {
    const key = String(lists.nextKey);
    setLists({
      nextKey: lists.nextKey + 1,
      rows: { ...lists.rows, [field.name]: [...lists.rows[field.name], { key, values: rowValues(field, undefined) }] },
    });
    focusAfterRender.current = rowControlId(field, key, field.fields[0]);
  };

  const removeRow = (field: ListField, rowKey: string) => {
    const rows = lists.rows[field.name];
    const index = rows.findIndex((row) => row.key === rowKey);
    const remaining = rows.filter((row) => row.key !== rowKey);
    setLists({ ...lists, rows: { ...lists.rows, [field.name]: remaining } });
    const next = remaining[index - 1] ?? remaining[0];
    focusAfterRender.current = next ? rowControlId(field, next.key, field.fields[0]) : addButtonId(field);
  };

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const sent = sentRowKeys(schema, lists.rows, formData);
        startTransition(() => {
          setSubmittedKeys(sent);
          formAction(formData);
        });
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
            {state.formError ?? `Please fix ${problems.length} ${problems.length === 1 ? "field" : "fields"}`}
          </h2>
          {problems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-danger">
              {problems.map((problem) => (
                <li key={problem.key}>
                  <a href={`#${problem.target}`} className="underline">
                    {problem.message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {schema.fields.map((field) =>
        field.type === "list" ? (
          <SchemaList
            key={field.name}
            field={field}
            id={idFor(field)}
            addId={addButtonId(field)}
            error={errors[field.name]}
            rows={lists.rows[field.name]}
            controlId={(rowKey, sub) => rowControlId(field, rowKey, sub)}
            errorFor={(rowKey, sub) => rowError(field, rowKey, sub)}
            onChange={(rowKey, sub, value) => setRowValue(field, rowKey, sub, value)}
            onAdd={() => addRow(field)}
            onRemove={(rowKey) => removeRow(field, rowKey)}
          />
        ) : (
          <SchemaField
            key={field.name}
            field={field}
            id={idFor(field)}
            error={errors[field.name]}
            value={values[field.name]}
            onChange={(value) => setValue(field.name, value)}
          />
        ),
      )}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function RequiredMark({ required }: { required: boolean }) {
  if (!required) return null;
  return (
    <span className="text-danger" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

type ListProps = {
  field: ListField;
  id: string;
  addId: string;
  error?: string;
  rows: ListRow[];
  controlId: (rowKey: string, sub: ScalarField) => string;
  errorFor: (rowKey: string, sub: ScalarField) => string | undefined;
  onChange: (rowKey: string, sub: string, value: string | boolean) => void;
  onAdd: () => void;
  onRemove: (rowKey: string) => void;
};

// One repeating group: a fieldset per item, with Add and Remove buttons.
function SchemaList({ field, id, addId, error, rows, controlId, errorFor, onChange, onAdd, onRemove }: ListProps) {
  const hintId = field.helpText ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset id={id} aria-describedby={describedBy} className="space-y-4">
      <legend className="label">
        {field.label}
        <RequiredMark required={field.required} />
      </legend>
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

      {rows.map((row, index) => {
        const itemName = `${field.itemLabel} ${index + 1}`;
        return (
          <fieldset key={row.key} className="space-y-4 rounded-md border border-line p-4">
            <legend className="px-1 text-sm font-medium text-ink">{itemName}</legend>
            {field.fields.map((sub) => (
              <SchemaField
                key={sub.name}
                field={sub}
                id={controlId(row.key, sub)}
                name={`${field.name}.${index}.${sub.name}`}
                error={errorFor(row.key, sub)}
                value={row.values[sub.name]}
                onChange={(value) => onChange(row.key, sub.name, value)}
              />
            ))}
            <button type="button" className="btn btn-secondary" onClick={() => onRemove(row.key)}>
              Remove {itemName}
            </button>
          </fieldset>
        );
      })}

      <button
        type="button"
        id={addId}
        className="btn btn-secondary"
        disabled={rows.length >= field.maxItems}
        onClick={onAdd}
      >
        Add {field.itemLabel}
      </button>
    </fieldset>
  );
}

type FieldProps = {
  field: ScalarField;
  id: string;
  name?: string;
  error?: string;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
};

// One labeled control with its help text and error.
function SchemaField({ field, id, name, error, value, onChange }: FieldProps) {
  const hintId = field.helpText ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const common = {
    id,
    name: name ?? field.name,
    required: field.required,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  };

  const text = typeof value === "string" ? value : "";
  const onText = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange(e.target.value);

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = <textarea {...common} rows={4} value={text} onChange={onText} className="input" />;
      break;
    case "number":
      control = (
        <input
          {...common}
          type="number"
          value={text}
          onChange={onText}
          min={field.min}
          max={field.max}
          step="any"
          className="input"
        />
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
          className="size-4 rounded border-input-border"
        />
      );
      break;
    default:
      control = (
        <input {...common} type="text" value={text} onChange={onText} maxLength={field.maxLength} className="input" />
      );
  }

  const label = (
    <label htmlFor={id} className={field.type === "boolean" ? "text-sm font-medium text-ink" : "label"}>
      {field.label}
      <RequiredMark required={field.required} />
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
