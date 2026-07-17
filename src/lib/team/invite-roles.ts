import { WorkspaceRole } from "@prisma/client";

/** Roles that can be invited from Settings → Team (workspace staff only). */
export const WORKSPACE_INVITE_ROLES: WorkspaceRole[] = [
  WorkspaceRole.agency_admin,
  WorkspaceRole.sales,
  WorkspaceRole.project_manager,
];

/** Roles PM can invite when staffing a project (delivery + PM). */
export const PROJECT_INVITE_ROLES: WorkspaceRole[] = [
  WorkspaceRole.project_manager,
  WorkspaceRole.ux_designer,
  WorkspaceRole.product_engineer,
  WorkspaceRole.qa_engineer,
];

export function isWorkspaceInviteRole(role: WorkspaceRole) {
  return WORKSPACE_INVITE_ROLES.includes(role);
}

export function isProjectInviteRole(role: WorkspaceRole) {
  return PROJECT_INVITE_ROLES.includes(role);
}

export function formatWorkspaceRole(role: WorkspaceRole) {
  return role.replace(/_/g, " ");
}
