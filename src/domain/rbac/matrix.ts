import type { WorkspaceRole } from "@prisma/client";

export const PERMISSIONS = [
  "lead:read",
  "lead:write",
  "contact:read",
  "contact:write",
  "proposal:read",
  "proposal:write",
  "proposal:send",
  "client:read",
  "client:write",
  "client:create",
  "client:self_update",
  "project:read",
  "project:write",
  "project:create",
  "project:member_manage",
  "project:publish",
  "milestone:read",
  "milestone:write",
  "milestone:submit_client",
  "milestone:client_review",
  "milestone:qa_signoff",
  "milestone:override",
  "task:read",
  "task:create",
  "task:approve",
  "task:update",
  "task:review",
  "task:comment",
  "task:visibility",
  "payment:read",
  "payment:write",
  "time:read",
  "time:write",
  "user:invite",
  "user:manage",
  "report:read",
  "portal:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[] | "*"> = {
  agency_admin: "*",
  sales: ["lead:read", "lead:write", "contact:read", "contact:write", "client:read"],
  project_manager: [
    "project:read",
    "project:write",
    "project:member_manage",
    "milestone:read",
    "milestone:write",
    "milestone:submit_client",
    "milestone:override",
    "task:read",
    "task:create",
    "task:approve",
    "task:update",
    "task:review",
    "task:comment",
    "task:visibility",
    "client:read",
    "proposal:read",
    "payment:read",
    "time:read",
    "time:write",
    "report:read",
  ],
  ux_designer: [
    "project:read",
    "milestone:read",
    "task:read",
    "task:create",
    "task:update",
    "task:review",
    "time:read",
    "time:write",
  ],
  product_engineer: [
    "project:read",
    "milestone:read",
    "task:read",
    "task:create",
    "task:update",
    "task:review",
    "time:read",
    "time:write",
  ],
  qa_engineer: [
    "project:read",
    "milestone:read",
    "milestone:qa_signoff",
    "task:read",
    "task:create",
    "task:update",
    "task:review",
    "time:read",
    "time:write",
  ],
  client: ["portal:read", "client:self_update", "milestone:client_review"],
};

export function permissionsForRole(role: WorkspaceRole): Set<string> {
  const perms = ROLE_PERMISSIONS[role];
  if (perms === "*") return new Set(["*"]);
  return new Set(perms);
}

export function roleHasPermission(
  role: WorkspaceRole,
  permission: Permission,
  permissions?: Set<string>,
) {
  if (role === "agency_admin") return true;
  const set = permissions ?? permissionsForRole(role);
  return set.has("*") || set.has(permission);
}
