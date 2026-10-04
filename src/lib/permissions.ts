// What a user may do in one application: owners everything, members by role, and
// members without a role view and create on their own responses.
export type Permission = "view" | "create" | "edit" | "delete";

// Whether permissions reach only the member's own responses or everyone's.
export type Scope = "own" | "all";

export type Permissions = Record<Permission, boolean> & { scope: Scope };

export type RoleFlags = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  allResponses: boolean;
};

export const OWNER_PERMISSIONS: Permissions = { view: true, create: true, edit: true, delete: true, scope: "all" };
export const DEFAULT_MEMBER_PERMISSIONS: Permissions = {
  view: true,
  create: true,
  edit: false,
  delete: false,
  scope: "own",
};
export const NO_PERMISSIONS: Permissions = { view: false, create: false, edit: false, delete: false, scope: "own" };

export function permissionsFromRole(role: RoleFlags): Permissions {
  return {
    view: role.canView,
    create: role.canCreate,
    edit: role.canEdit,
    delete: role.canDelete,
    scope: role.allResponses ? "all" : "own",
  };
}

export function permissionsFor(input: {
  isOwner: boolean;
  membership: { role: RoleFlags | null } | null;
}): Permissions {
  if (input.isOwner) return OWNER_PERMISSIONS;
  if (!input.membership) return NO_PERMISSIONS;
  if (!input.membership.role) return DEFAULT_MEMBER_PERMISSIONS;
  return permissionsFromRole(input.membership.role);
}

export function describePermissions(p: Permissions): string {
  const granted = (["view", "create", "edit", "delete"] as Permission[]).filter((k) => p[k]);
  if (granted.length === 0) return "No access";
  return `${granted.join(", ")} (${p.scope === "all" ? "all responses" : "own responses only"})`;
}
