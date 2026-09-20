import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tatiTheme } from "@/lib/theme";
import logo from "@/assets/tati-logo.svg";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="TATI ChildSave home" className={cn("inline-flex shrink-0", className)}>
      <img src={logo} alt="TATI" width={44} height={44} className="h-11 w-11" />
    </Link>
  );
}

export function Page({
  children,
  withBottomNav = false,
  className,
}: {
  children: ReactNode;
  withBottomNav?: boolean;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={cn(tatiTheme.container, "pt-4", withBottomNav ? "pb-28" : "pb-12", className)}>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  backTo,
  right,
  listenable = false,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  backTo?: string;
  right?: ReactNode;
  listenable?: boolean;
}) {
  const router = useRouter();
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Go back"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-xl shadow-card"
          >
            <span aria-hidden="true">←</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.history.back()}
            aria-label="Go back"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-xl shadow-card"
          >
            <span aria-hidden="true">←</span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="break-words text-xl font-extrabold leading-tight">{title}</h1>
        </div>
        <Logo />
        {listenable ? <ListenButton /> : null}
        {right}
      </div>
      {subtitle ? <p className="mt-3 text-base text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}

/** Placeholder for the future read-aloud feature. */
export function ListenButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="Listen to this page (coming soon, unavailable)"
      disabled
      className={cn(
        "flex min-h-[48px] items-center gap-2 rounded-2xl bg-card px-4 text-base font-extrabold text-primary shadow-card disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      <span aria-hidden="true">🔊</span>
      Listen
    </button>
  );
}

const navItems = [
  { to: "/child/home", label: "Home", icon: "🏠" },
  { to: "/child/learn", label: "My Journey", icon: "🧭" },
  { to: "/child/progress", label: "Progress", icon: "📊" },
] as const;

export function BottomNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const focusedActivity = pathname.startsWith("/child/lesson/") || pathname.startsWith("/child/scenario/");

  if (focusedActivity) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className={cn(tatiTheme.container, "flex items-stretch justify-around py-1")}>
        {navItems.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-extrabold text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <span aria-hidden="true" className="text-xl">
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-3xl bg-card p-5 shadow-card"
      >
        <div className="flex items-start gap-3">
          <h2 className="flex-1 text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-lg"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="mt-3 text-base">{children}</div>
        {footer ? <div className="mt-5 space-y-3">{footer}</div> : null}
      </div>
    </div>
  );
}
