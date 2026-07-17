import { ProposalStatus } from "@prisma/client";

export function canCreateClient(
  proposalStatus: ProposalStatus | undefined,
  convertedClientId: string | null,
) {
  return !convertedClientId && proposalStatus === ProposalStatus.accepted;
}

export function proposalStageLabel(status: ProposalStatus) {
  const map: Record<ProposalStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected",
  };
  return map[status];
}
