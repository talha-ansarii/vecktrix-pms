import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProposalStatus } from "@prisma/client";
import { canCreateClient } from "./pipeline-helpers";
import { roleHasPermission } from "@/domain/rbac/matrix";

describe("pipeline v2", () => {
  it("canCreateClient when proposal accepted", () => {
    assert.equal(canCreateClient(ProposalStatus.accepted, null), true);
  });

  it("cannot create client when already converted", () => {
    assert.equal(canCreateClient(ProposalStatus.accepted, "client-id"), false);
  });

  it("sales blocked from project:create", () => {
    assert.equal(roleHasPermission("sales", "project:create"), false);
  });
});
