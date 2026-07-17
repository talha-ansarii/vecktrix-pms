import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProposalStatus } from "@prisma/client";
import { canCreateClient, proposalStageLabel } from "./pipeline-helpers";

describe("proposal state machine", () => {
  it("labels proposal stages", () => {
    assert.equal(proposalStageLabel(ProposalStatus.draft), "Draft");
    assert.equal(proposalStageLabel(ProposalStatus.sent), "Sent");
    assert.equal(proposalStageLabel(ProposalStatus.accepted), "Accepted");
    assert.equal(proposalStageLabel(ProposalStatus.rejected), "Rejected");
  });

  it("allows client creation only when accepted and not converted", () => {
    assert.equal(canCreateClient(ProposalStatus.draft, null), false);
    assert.equal(canCreateClient(ProposalStatus.sent, null), false);
    assert.equal(canCreateClient(ProposalStatus.accepted, null), true);
    assert.equal(canCreateClient(ProposalStatus.accepted, "client-1"), false);
    assert.equal(canCreateClient(ProposalStatus.rejected, null), false);
  });
});
