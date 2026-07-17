"use server";

import { getOrCreateProposal, uploadProposalFile, listProposalFiles, deleteProposalFile } from "@/lib/actions/proposals";

export async function listLeadFiles(leadId: string) {
  const proposal = await getOrCreateProposal(leadId);
  return listProposalFiles(proposal.id);
}

export async function uploadLeadFile(formData: FormData) {
  const leadId = formData.get("leadId") as string;
  if (!leadId) throw new Error("Lead required");
  const proposal = await getOrCreateProposal(leadId);
  return uploadProposalFile(proposal.id, formData);
}

export async function deleteLeadFile(fileId: string) {
  return deleteProposalFile(fileId);
}
