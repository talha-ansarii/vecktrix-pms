"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  Search,
  Check,
  FolderKanban,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  agencyNavItems,
  clientNavItems,
  projectNavItems,
  isNavActive,
  type NavItem,
} from "@/lib/navigation";

const COLLAPSE_KEY = "vecktrix-pms-sidebar-collapsed";

type ProjectOption = { id: string; name: string; client?: { name: string } | null };

export type SidebarShellProps = {
  children: React.ReactNode;
  isClient?: boolean;
  currentPath: string;
  currentProject?: { id: string; name: string } | null;
  user: { name?: string | null; email?: string | null };
  workspaceName: string;
  projects: ProjectOption[];
  agencyNavItems?: NavItem[];
  showProjectSwitcher?: boolean;
};

type SidebarContentProps = Omit<SidebarShellProps, "children"> & {
  collapsed: boolean;
  onNavigate?: () => void;
  onOpenSearch?: () => void;
};

function NavLink({
  item,
  currentPath,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  currentPath: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isNavActive(item, currentPath);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-white/10 text-white" : "text-text-darkSecondary hover:bg-white/5 hover:text-white",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function NavSection({
  label,
  items,
  currentPath,
  collapsed,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  currentPath: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (collapsed) {
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} currentPath={currentPath} collapsed onNavigate={onNavigate} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-darkSecondary">{label}</p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} currentPath={currentPath} collapsed={false} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function CommandPalette({
  open,
  onClose,
  items,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  projects: ProjectOption[];
}) {
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const nav = items.filter((i) => !query || i.label.toLowerCase().includes(query));
    const projs = projects.filter(
      (p) => !query || p.name.toLowerCase().includes(query) || p.client?.name?.toLowerCase().includes(query),
    );
    return { nav, projs };
  }, [q, items, projects]);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-lg card-dark p-0 overflow-hidden animate-fade-in">
        <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
          <Search className="h-4 w-4 text-text-darkSecondary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search navigation and projects…"
            className="flex-1 bg-transparent text-white outline-none placeholder:text-text-darkSecondary text-sm"
          />
          <kbd className="hidden sm:inline text-[10px] text-text-darkSecondary border border-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.nav.length > 0 && (
            <>
              <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-text-darkSecondary">Navigation</p>
              {filtered.nav.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-[4px] text-sm text-white hover:bg-white/5"
                  onClick={() => go(item.href)}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
          {filtered.projs.length > 0 && (
            <>
              <p className="px-2 py-1 mt-2 text-[11px] uppercase tracking-wider text-text-darkSecondary">Projects</p>
              {filtered.projs.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-[4px] text-sm hover:bg-white/5"
                  onClick={() => go(`/projects/${p.id}`)}
                >
                  <span className="text-white block">{p.name}</span>
                  {p.client?.name && (
                    <span className="text-xs text-text-darkSecondary">{p.client.name}</span>
                  )}
                </button>
              ))}
            </>
          )}
          {filtered.nav.length === 0 && filtered.projs.length === 0 && (
            <p className="px-3 py-6 text-sm text-text-darkSecondary text-center">No results</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectSwitcher({
  projects,
  currentProject,
  collapsed,
}: {
  projects: ProjectOption[];
  currentProject?: { id: string; name: string } | null;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = currentProject?.name ?? "Select project";

  if (collapsed) {
    return (
      <Link
        href={currentProject ? `/projects/${currentProject.id}` : "/projects"}
        title={label}
        className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-white/10 text-text-darkSecondary hover:bg-white/5 hover:text-white"
      >
        <FolderKanban className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-[4px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:border-white/20"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-darkSecondary" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 card-dark p-2 shadow-xl !p-2">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-text-darkSecondary">Projects</p>
            <div className="max-h-48 overflow-y-auto">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-2 rounded-[4px] px-2 py-2 text-sm hover:bg-white/5"
                >
                  <span className="truncate text-white">{p.name}</span>
                  {currentProject?.id === p.id && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                </Link>
              ))}
            </div>
            <div className="mt-2 border-t border-white/6 pt-2 space-y-1">
              <Link
                href="/projects"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-[4px] px-2 py-2 text-sm text-text-darkSecondary hover:bg-white/5 hover:text-white"
              >
                <Plus className="h-4 w-4" /> Manage projects
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AccountMenu({
  user,
  workspaceName,
  collapsed,
}: {
  user: { name?: string | null; email?: string | null };
  workspaceName: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initial = (user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-[4px] px-2 py-2 text-left hover:bg-white/5",
          collapsed && "justify-center",
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue text-sm font-medium text-white">
          {initial}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white">{user.name ?? "Account"}</span>
            <span className="block truncate text-xs text-text-darkSecondary">{workspaceName}</span>
          </span>
        )}
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1 card-dark !p-2 min-w-[200px]">
            <div className="px-3 py-2 border-b border-white/6 mb-1">
              <p className="text-sm text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-text-darkSecondary truncate">{user.email}</p>
            </div>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-text-darkSecondary hover:bg-white/5 hover:text-white rounded-[4px]"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent(props: SidebarContentProps) {
  const {
    isClient,
    currentPath,
    currentProject,
    user,
    workspaceName,
    projects,
    collapsed,
    onNavigate,
    onOpenSearch,
    agencyNavItems: agencyNavOverride,
    showProjectSwitcher = true,
  } = props;
  const agencyItems = isClient ? clientNavItems : (agencyNavOverride ?? agencyNavItems);
  const projectItems =
    currentProject && !isClient && showProjectSwitcher ? projectNavItems(currentProject.id) : [];

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className={cn("flex items-center gap-2 p-3 border-b border-white/6", collapsed && "flex-col")}>
        {!isClient && showProjectSwitcher && (
          <ProjectSwitcher projects={projects} currentProject={currentProject} collapsed={collapsed} />
        )}
        {isClient && !collapsed && (
          <Link href="/portal" className="flex items-center gap-2 flex-1 min-w-0 px-1">
            <Image src="/logo.svg" alt="" width={20} height={20} />
            <span className="font-serif text-white truncate">Client portal</span>
          </Link>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={() => onOpenSearch?.()}
            className="flex w-full items-center gap-2 rounded-[4px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-darkSecondary hover:border-white/20"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="text-[10px] border border-white/10 px-1 rounded">⌘K</kbd>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        <NavSection
          label={isClient ? "Portal" : "Agency"}
          items={agencyItems}
          currentPath={currentPath}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        {projectItems.length > 0 && (
          <NavSection
            label="This project"
            items={projectItems}
            currentPath={currentPath}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        )}
      </div>

      <div className="border-t border-white/6 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-text-darkSecondary">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {workspaceName}
          </div>
        )}
        <AccountMenu user={user} workspaceName={workspaceName} collapsed={collapsed} />
      </div>
    </div>
  );
}

export function SidebarShell({
  children,
  isClient = false,
  currentPath = "/dashboard",
  currentProject = null,
  user,
  workspaceName,
  projects,
  agencyNavItems: agencyNavOverride,
  showProjectSwitcher = true,
}: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navItems = isClient ? clientNavItems : (agencyNavOverride ?? agencyNavItems);

  const sidebarInner = (
    <SidebarContent
      isClient={isClient}
      currentPath={currentPath}
      currentProject={currentProject}
      user={user}
      workspaceName={workspaceName}
      projects={projects}
      collapsed={collapsed}
      onNavigate={() => setMobileOpen(false)}
      onOpenSearch={() => setSearchOpen(true)}
      agencyNavItems={agencyNavOverride}
      showProjectSwitcher={showProjectSwitcher}
    />
  );

  return (
    <div className="min-h-dvh bg-bg-dark flex">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image src="/bg.avif" alt="" fill className="object-cover opacity-15" priority />
        <div className="absolute inset-0 bg-bg-dark/90" />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative z-20 hidden md:flex flex-col border-r border-white/6 bg-bg-cardDark/80 backdrop-blur-md h-dvh sticky top-0 transition-[width] duration-200",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/6">
          {!collapsed ? (
            <Link href={isClient ? "/portal" : "/dashboard"} className="flex items-center gap-2 min-w-0">
              <Image src="/logo.svg" alt="Vecktrix" width={22} height={22} />
              <span className="font-serif text-white truncate">Vecktrix PMS</span>
            </Link>
          ) : (
            <Link href={isClient ? "/portal" : "/dashboard"} className="mx-auto" title="Vecktrix PMS">
              <Image src="/logo.svg" alt="Vecktrix" width={22} height={22} />
            </Link>
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-[4px] text-text-darkSecondary hover:bg-white/5 hover:text-white shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        {sidebarInner}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-white/6 bg-bg-cardDark/95 px-4 backdrop-blur-md">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href={isClient ? "/portal" : "/dashboard"} className="font-serif text-white">
          Vecktrix
        </Link>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-[4px] border border-white/10"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-dvh w-[280px] flex-col border-r border-white/6 bg-bg-cardDark md:hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/6">
              <span className="font-serif text-white">Menu</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-text-darkSecondary">
                ✕
              </button>
            </div>
            {sidebarInner}
          </aside>
        </>
      )}

      <main className="relative z-10 flex-1 min-w-0 md:pt-0 pt-14">
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">{children}</div>
        </div>
      </main>

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={navItems}
        projects={isClient ? [] : projects}
      />
    </div>
  );
}
