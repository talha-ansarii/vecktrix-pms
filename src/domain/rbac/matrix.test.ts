import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roleHasPermission, permissionsForRole } from "./matrix";

describe("RBAC matrix", () => {
  it("admin has all via wildcard check", () => {
    assert.equal(roleHasPermission("agency_admin", "project:create"), true);
  });

  it("sales cannot create clients or projects", () => {
    assert.equal(roleHasPermission("sales", "client:create"), false);
    assert.equal(roleHasPermission("sales", "project:create"), false);
  });

  it("pm can manage projects", () => {
    assert.equal(roleHasPermission("project_manager", "project:write"), true);
  });

  it("client has portal only", () => {
    const perms = permissionsForRole("client");
    assert.ok(perms.has("portal:read"));
    assert.equal(perms.has("project:read"), false);
  });
});
