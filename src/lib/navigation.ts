import type { LucideIcon } from "lucide-react";
import type { WorkspaceRole } from "@prisma/client";
import {
  Home,
  Users,
  Building2,
  FolderKanban,
  BarChart3,
  UserCog,
  LayoutDashboard,
} from "lucide-react";

function roleHasPermission(
  permissions: Set<string>,
  permission: string,
  workspaceRole: WorkspaceRole,
) {
  if (workspaceRole === "agency_admin") return true;
  return permissions.has(permission) || permissions.has("*");
}

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
};

export const agencyNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/leads",
    label: "Leads",
    icon: Users,
    match: (p) => p.startsWith("/leads"),
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Building2,
    match: (p) => p.startsWith("/clients"),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderKanban,
    match: (p) => p === "/projects" || p.startsWith("/projects/"),
  },
  {
    href: "/reports",
    label: "Usage",
    icon: BarChart3,
    match: (p) => p.startsWith("/reports"),
  },
  {
    href: "/settings/team",
    label: "Team",
    icon: UserCog,
    match: (p) => p.startsWith("/settings"),
  },
];

export const clientNavItems: NavItem[] = [
  {
    href: "/portal",
    label: "Projects",
    icon: LayoutDashboard,
    match: (p) => p === "/portal",
  },
  {
    href: "/portal/profile",
    label: "Profile",
    icon: UserCog,
    match: (p) => p.startsWith("/portal/profile"),
  },
];

export const projectNavItems = (projectId: string): NavItem[] => [
  {
    href: `/projects/${projectId}`,
    label: "Overview",
    icon: LayoutDashboard,
    match: (p) => p === `/projects/${projectId}`,
  },
];

export function isNavActive(item: NavItem, currentPath: string) {
  return item.match ? item.match(currentPath) : currentPath === item.href;
}

/** Permission required to show each agency nav item (null = any workspace member). */
const AGENCY_NAV_PERMISSION: Record<string, string | null> = {
  "/dashboard": null,
  "/leads": "lead:read",
  "/clients": "client:read",
  "/projects": "project:read",
  "/reports": "report:read",
  "/settings/team": "user:invite",
};

export function filterAgencyNavItems(
  permissions: Set<string>,
  workspaceRole: WorkspaceRole,
): NavItem[] {
  return agencyNavItems.filter((item) => {
    const required = AGENCY_NAV_PERMISSION[item.href];
    if (required === null) return true;
    if (item.href === "/settings/team") {
      return (
        roleHasPermission(permissions, "user:invite", workspaceRole) ||
        roleHasPermission(permissions, "user:manage", workspaceRole)
      );
    }
    return roleHasPermission(permissions, required, workspaceRole);
  });
}
