import { describe, expect, it } from "vitest";
import { describePermissions, permissionsFor } from "./permissions";

const viewer = { canView: true, canCreate: false, canEdit: false, canDelete: false, allResponses: false };
const editor = { canView: true, canCreate: true, canEdit: true, canDelete: false, allResponses: true };
const blocked = { canView: false, canCreate: false, canEdit: false, canDelete: false, allResponses: false };

describe("permissionsFor", () => {
  it("gives owners everything regardless of membership", () => {
    expect(permissionsFor({ isOwner: true, membership: null })).toEqual({
      view: true,
      create: true,
      edit: true,
      delete: true,
      scope: "all",
    });
  });

  it("gives non-members nothing", () => {
    expect(permissionsFor({ isOwner: false, membership: null })).toEqual({
      view: false,
      create: false,
      edit: false,
      delete: false,
      scope: "own",
    });
  });

  it("gives members without a role view and create on their own responses only", () => {
    expect(permissionsFor({ isOwner: false, membership: { role: null } })).toEqual({
      view: true,
      create: true,
      edit: false,
      delete: false,
      scope: "own",
    });
  });

  it("maps a role's flags one to one", () => {
    expect(permissionsFor({ isOwner: false, membership: { role: viewer } })).toEqual({
      view: true,
      create: false,
      edit: false,
      delete: false,
      scope: "own",
    });
    expect(permissionsFor({ isOwner: false, membership: { role: editor } })).toEqual({
      view: true,
      create: true,
      edit: true,
      delete: false,
      scope: "all",
    });
  });

  it("can remove even view access", () => {
    expect(permissionsFor({ isOwner: false, membership: { role: blocked } }).view).toBe(false);
  });
});

describe("describePermissions", () => {
  it("lists granted permissions or says none", () => {
    expect(describePermissions({ view: true, create: true, edit: false, delete: false, scope: "own" })).toBe(
      "view, create (own responses only)",
    );
    expect(describePermissions({ view: false, create: false, edit: false, delete: false, scope: "own" })).toBe(
      "No access",
    );
  });
});
