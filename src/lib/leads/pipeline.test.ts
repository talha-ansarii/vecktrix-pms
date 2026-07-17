import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canConvertLead } from "./pipeline.ts";
import { LeadStatus } from "@prisma/client";
import { projectListRequiresMembership } from "../rbac/project-scope.ts";

describe("lead pipeline", () => {
  it("allows convert for proposal without client", () => {
    assert.equal(canConvertLead(LeadStatus.proposal, null), true);
  });

  it("blocks convert when already linked", () => {
    assert.equal(canConvertLead(LeadStatus.won, "client-id"), false);
  });
});

describe("project scope", () => {
  it("scopes delivery roles", () => {
    assert.equal(projectListRequiresMembership("product_engineer"), true);
    assert.equal(projectListRequiresMembership("sales"), false);
  });
});
