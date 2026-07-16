import type { LucideIcon } from "lucide-react";
import {
  Home,
  Users,
  Building2,
  FolderKanban,
  BarChart3,
  UserCog,
  LayoutDashboard,
} from "lucide-react";

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
