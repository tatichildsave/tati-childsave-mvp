import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ChevronDown, LogOut, Menu, X } from "lucide-react";
import logo from "@/assets/tati-logo.png";
import { cn } from "@/lib/utils";
import { parentTheme as t } from "./theme";

export interface ParentNavItem {
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  /** Route path (TanStack Link) or in-page anchor ("#section"). Omit for upcoming features. */
  to?: string;
  params?: Record<string, string>;
  hash?: string;
  active?: boolean;
}

interface ParentShellProps {
  title: string;
  subtitle?: string;
  navItems: ParentNavItem[];
  userName: string;
  userInitials: string;
  onSignOut: () => void;
  signingOut?: boolean | undefined;
  children: ReactNode;
}

export function ParentShell({
  title,
  subtitle = "TATI ChildSave",
  navItems,
  userName,
  userInitials,
  onSignOut,
  signingOut,
  children,
}: ParentShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  function handleMenu() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((c) => !c);
    } else {
      setDrawerOpen(true);
    }
  }

  return (
    <div className={cn("min-h-screen font-sans", t.pageBg)}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#E9EDF4] bg-white lg:flex",
          collapsed && "lg:hidden",
        )}
        aria-label="Parent navigation"
      >
        <SidebarContent navItems={navItems} onSignOut={onSignOut} signingOut={signingOut} />
      </aside>

      {/* Mobile / tablet drawer */}
      <MobileDrawer open={drawerOpen} onClose={closeDrawer}>
        <SidebarContent
          navItems={navItems}
          onSignOut={onSignOut}
          signingOut={signingOut}
          onNavigate={closeDrawer}
        />
      </MobileDrawer>

      <div className={cn("flex min-h-screen flex-col", !collapsed && "lg:pl-60")}>
        <TopNav
          title={title}
          subtitle={subtitle}
          userName={userName}
          userInitials={userInitials}
          onMenu={handleMenu}
          menuExpanded={drawerOpen || !collapsed}
          menuButtonRef={menuButtonRef}
        />
        <main id="main-content" className="flex-1 px-3 pb-6 pt-3 sm:px-4 lg:px-4 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link
      to="/parent/dashboard-v2"
      className={cn("flex items-center gap-3 rounded-xl", t.focus)}
      aria-label="TATI ChildSave parent home"
    >
      <img src={logo} alt="" className="h-[56px] w-[56px] shrink-0 select-none" draggable={false} />
      <span className={cn("leading-[1.05]", t.navy)}>
        <span className="block text-[24px] font-extrabold tracking-tight">TATI</span>
        <span className="block text-[18px] font-extrabold tracking-tight">ChildSave</span>
      </span>
    </Link>
  );
}

function SidebarContent({
  navItems,
  onSignOut,
  signingOut,
  onNavigate,
}: {
  navItems: ParentNavItem[];
  onSignOut: () => void;
  signingOut?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-5 pt-5 [scrollbar-width:thin]">
      <Brand />

      <nav className="mt-6 flex-1 space-y-1" aria-label="Parent sections">
        {navItems.map((item) => (
          <NavLink key={item.label} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className={cn(
          "mt-4 flex h-[46px] w-full items-center justify-center gap-2.5 rounded-xl border border-[#F7C9C9] bg-[#FDEFEF] text-[15px] font-bold text-[#E0393E] transition-colors hover:bg-[#FBE2E2] disabled:opacity-60",
          t.focus,
        )}
      >
        <LogOut className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
        {signingOut ? "Signing out…" : "Logout"}
      </button>
    </div>
  );
}

function NavLink({ item, onNavigate }: { item: ParentNavItem; onNavigate?: (() => void) | undefined }) {
  const Icon = item.icon;
  const base = cn(
    "group flex h-11 w-full items-center gap-3.5 rounded-xl px-4 text-[15px] font-semibold transition-colors",
    t.focus,
  );
  const content = (
    <>
      <Icon
        className={cn(
          "h-[22px] w-[22px] shrink-0",
          item.active
            ? "text-[#1C5AD6]"
            : !item.to && !item.hash
              ? "text-[#A7AFC0]"
              : "text-[#4B5677] group-hover:text-[#13215A]",
        )}
        strokeWidth={2.2}
        aria-hidden
      />
      <span className="flex-1 truncate text-left">{item.label}</span>
      {!item.to && !item.hash ? <span className="sr-only">(coming soon)</span> : null}
    </>
  );

  if (!item.to && !item.hash) {
    return (
      <span
        className={cn(base, "cursor-default text-[#9AA3B5]")}
        aria-disabled="true"
        title="Coming soon"
      >
        {content}
      </span>
    );
  }

  const stateClass = item.active
    ? "bg-[#E9F1FE] text-[#1C5AD6]"
    : "text-[#3D4766] hover:bg-[#F4F6FB] hover:text-[#13215A]";

  if (!item.to && item.hash) {
    return (
      <a href={`#${item.hash}`} onClick={onNavigate} className={cn(base, stateClass)}>
        {content}
      </a>
    );
  }

  return (
    <Link
      to={item.to as string}
      params={item.params as never}
      {...(item.hash ? { hash: item.hash } : {})}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      {...(item.active ? { "aria-current": "page" as const } : {})}
      className={cn(base, stateClass)}
    >
      {content}
    </Link>
  );
}

function TopNav({
  title,
  subtitle,
  userName,
  userInitials,
  onMenu,
  menuExpanded,
  menuButtonRef,
}: {
  title: string;
  subtitle: string;
  userName: string;
  userInitials: string;
  onMenu: () => void;
  menuExpanded: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#E9EDF4] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-[66px] items-center gap-3 px-3 sm:px-4 lg:px-6">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onMenu}
          aria-label="Toggle navigation"
          aria-expanded={menuExpanded}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E4E9F2] bg-[#F7F9FC] text-[#13215A] transition-colors hover:bg-[#EEF2F8]",
            t.focus,
          )}
        >
          <Menu className="h-[22px] w-[22px]" strokeWidth={2.3} aria-hidden />
        </button>

        <div className="ml-1 min-w-0 flex-1">
          <p className={cn("truncate text-[16px] font-extrabold leading-tight", t.navy)}>{title}</p>
          <p className={cn("truncate text-[12px] font-semibold leading-tight", t.muted)}>{subtitle}</p>
        </div>

        <span
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E4E9F2] bg-white text-[#13215A]"
          role="img"
          aria-label="Notifications are not available yet"
          title="Notifications are not available yet"
        >
          <Bell className="h-[19px] w-[19px]" strokeWidth={2.2} aria-hidden />
        </span>

        <div className="ml-1 flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3ECFC] text-[14px] font-extrabold text-[#1C5AD6]"
            aria-hidden
          >
            {userInitials}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className={cn("block max-w-[160px] truncate text-[14px] font-extrabold leading-tight", t.navy)}>
              {userName}
            </span>
            <span className={cn("block text-[12px] font-semibold leading-tight", t.muted)}>Parent</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-[#6B7489] sm:block" strokeWidth={2.4} aria-hidden />
        </div>
      </div>
    </header>
  );
}

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div className={cn("lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} inert={!open}>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#0B1435]/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Parent navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] bg-white shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className={cn(
            "absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-[#4B5677] hover:bg-[#F4F6FB]",
            t.focus,
          )}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {open ? children : null}
      </div>
    </div>
  );
}
