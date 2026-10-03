"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Users,
  ShieldCheck,
  ScrollText,
  UserCircle,
  LockKeyhole,
  Menu,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Logout } from "./auth-form";
export function WorkspaceShell({
  children,
  name,
  role,
  branches,
  links,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
  branches: { id: string; name: string; active: boolean }[];
  links: string[];
}) {
  const pathname = usePathname(),
    router = useRouter(),
    q = useSearchParams();
  const items = [
    ["dashboard", "Overview", LayoutDashboard],
    ["branches", "Branches", Building2],
    ["users", "People", Users],
    ["roles", "Roles & permissions", ShieldCheck],
    ["audit", "Audit log", ScrollText],
    ["profile", "My profile", UserCircle],
  ] as const;
  const branch = q.get("branch") ?? "";
  const navigation = (mobile = false) => (
    <nav
      aria-label={mobile ? "Mobile navigation" : "Main navigation"}
      className="space-y-1"
    >
      {items
        .filter(([key]) => links.includes(key))
        .map(([key, title, Icon]) => (
          <Link
            key={key}
            aria-current={pathname.startsWith("/" + key) ? "page" : undefined}
            className={`nav-link ${pathname.startsWith("/" + key) ? "selected" : ""}`}
            href={`/${key}${branch ? "?branch=" + branch : ""}`}
            onClick={(e) => {
              if (mobile) {
                const details = e.currentTarget.closest("details");
                if (details) details.open = false;
              }
            }}
          >
            <Icon size={18} strokeWidth={1.5} />
            {title}
          </Link>
        ))}
    </nav>
  );
  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <Link href="/dashboard" className="sidebar-brand">
          <BrandLogo priority className="h-20 w-20" />
          <p className="brand-name">JN Fin Services</p>
          <p className="brand-caption">SUSTAINABLE GROWTH</p>
        </Link>
        <p className="sidebar-section-label">YOUR WORKSPACE</p>
        {navigation()}
        <div className="sidebar-footer">
          <div>
            <LockKeyhole size={14} /> Secure staff workspace
          </div>
          <p>
            Thoughtfully connected.
            <br />
            Trusted at every branch.
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="workspace-topbar">
          <details className="mobile-navigation">
            <summary>
              <span className="mobile-brand">
                <BrandLogo className="h-11 w-11" />
                JN Fin Services
              </span>
              <span className="mobile-menu-label">
                <Menu size={18} />
                Menu
              </span>
            </summary>
            {navigation(true)}
          </details>
          <div className="branch-control">
            <span>Workspace</span>
            <label className="sr-only" htmlFor="branch-switcher">
              Selected branch
            </label>
            <select
              id="branch-switcher"
              value={branch}
              onChange={(e) =>
                router.push(
                  `${pathname.startsWith("/branches/") ? (e.target.value ? "/branches/" + e.target.value : "/branches") : pathname}${e.target.value ? "?branch=" + e.target.value : ""}`,
                )
              }
            >
              <option value="">
                {role === "admin" || role === "super_admin"
                  ? "All branches"
                  : "My branches"}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </div>
          <div className="profile-control">
            <Link
              className="profile-avatar"
              href="/profile"
              aria-label="My profile"
            >
              {name.slice(0, 1)}
            </Link>
            <div>
              <p className="profile-name">{name}</p>
              <p className="profile-role">{role.replace("_", " ")}</p>
            </div>
            <Logout />
          </div>
        </header>
        <main id="main" className="workspace-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>JN Fin Services · Internal workspace</span>
          <Link href="/profile#install">Install app ↗</Link>
        </footer>
      </div>
    </div>
  );
}
