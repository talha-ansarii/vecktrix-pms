import { sendViaMsg91 } from "./msg91";
import type { SendEmailInput } from "./types";

export async function sendEmail(input: SendEmailInput) {
  return sendViaMsg91(input);
}

export function inviteEmailHtml(inviteUrl: string, workspaceName: string) {
  return `<p>You have been invited to join <strong>${workspaceName}</strong> on Vecktrix PMS.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`;
}

export function milestoneReviewEmailHtml(clientName: string, projectName: string, portalUrl: string) {
  return `<p>Hi ${clientName},</p><p>A milestone on <strong>${projectName}</strong> is ready for your review.</p><p><a href="${portalUrl}">Open client portal</a></p>`;
}
