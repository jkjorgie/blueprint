// The shape of a role as submitted from the role form: a name plus five
// permission checkboxes. Shared by the role actions so create and update
// validate identically.
import { z } from "zod";

export const roleFields = z.object({
  name: z.string().trim().min(1, "Role name is required.").max(40, "Role name must be 40 characters or fewer."),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  allResponses: z.boolean(),
});

export type RoleFields = z.infer<typeof roleFields>;

export type RolePermission = keyof Omit<RoleFields, "name">;

// The permission flags in display order, shared by the role form's checkboxes
// and the roles table on the application edit page.
export const ROLE_PERMISSIONS: { key: RolePermission; label: string; hint: string }[] = [
  { key: "canView", label: "View", hint: "Open the application and see its responses." },
  { key: "canCreate", label: "Create", hint: "Submit new responses." },
  { key: "canEdit", label: "Edit", hint: "Change existing responses." },
  { key: "canDelete", label: "Delete", hint: "Remove responses." },
  {
    key: "allResponses",
    label: "All responses",
    hint: "Apply these permissions to every response in the application, not only the ones the member submitted.",
  },
];

// Checkboxes arrive as "on" when checked and are absent otherwise.
export function readRoleForm(formData: FormData) {
  return roleFields.safeParse({
    name: formData.get("name"),
    canView: formData.get("canView") === "on",
    canCreate: formData.get("canCreate") === "on",
    canEdit: formData.get("canEdit") === "on",
    canDelete: formData.get("canDelete") === "on",
    allResponses: formData.get("allResponses") === "on",
  });
}
