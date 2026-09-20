// Validation for the analyst-facing "new application" and "edit application"
// forms: name, slug, description, and the schema as JSON text. Pure functions,
// so the rules are unit-tested without a database or a request.
import { z } from "zod";
import { parseAppSchemaJson, type AppSchema } from "./app-schema";

export type ApplicationFormValues = {
  name: string;
  slug: string;
  description: string;
  schemaJson: string;
};

export type ApplicationFormErrors = {
  name?: string;
  slug?: string;
  description?: string;
  // The schema can fail in several places at once, so it gets a list.
  schema?: string[];
};

export type ApplicationFormState = {
  errors?: ApplicationFormErrors;
  formError?: string;
  values?: ApplicationFormValues;
};

export type ApplicationData = {
  name: string;
  slug: string;
  description: string | null;
  schema: AppSchema;
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 60;

// "Bug Reports!" -> "bug-reports". Used to suggest a slug from the name.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

const fields = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Name must be 80 characters or fewer."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(SLUG_MAX, `Slug must be ${SLUG_MAX} characters or fewer.`)
    .regex(SLUG_PATTERN, "Slug can only contain lowercase letters, numbers, and single hyphens."),
  description: z.string().trim().max(300, "Description must be 300 characters or fewer."),
});

export function readApplicationForm(formData: FormData): ApplicationFormValues {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    schemaJson: text("schemaJson"),
  };
}

export type ApplicationParseResult =
  | { ok: true; data: ApplicationData }
  | { ok: false; errors: ApplicationFormErrors };

export function parseApplicationForm(values: ApplicationFormValues): ApplicationParseResult {
  const errors: ApplicationFormErrors = {};

  const result = fields.safeParse(values);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof typeof errors;
      if (key === "name" || key === "slug" || key === "description") {
        if (!errors[key]) errors[key] = issue.message;
      }
    }
  }

  const schema = parseAppSchemaJson(values.schemaJson);
  if (!schema.ok) errors.schema = schema.errors;

  if (Object.keys(errors).length > 0 || !result.success || !schema.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name: result.data.name,
      slug: result.data.slug,
      description: result.data.description === "" ? null : result.data.description,
      schema: schema.schema,
    },
  };
}

// Pre-filled into the JSON box on the new-application page so an analyst
// starts from a working example instead of a blank textarea.
export const STARTER_SCHEMA_JSON = JSON.stringify(
  {
    title: "Feedback",
    fields: [
      { name: "summary", label: "Summary", type: "text", required: true, maxLength: 120 },
      { name: "category", label: "Category", type: "select", required: true, options: ["Idea", "Problem", "Question"] },
      { name: "details", label: "Details", type: "textarea", required: false, helpText: "Anything that would help us understand." },
      { name: "follow_up", label: "I would like a reply", type: "boolean", required: false },
    ],
  },
  null,
  2,
);
