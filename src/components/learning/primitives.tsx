import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-5 text-base">{children}</div>
    </div>
  );
}

export function TopBar({ title, backTo, right }: { title: string; backTo?: string; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-center gap-3">
      {backTo ? (
        <Link
          to={backTo}
          aria-label="Go back"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <span aria-hidden="true">←</span>
        </Link>
      ) : null}
      <h1 className="flex-1 text-2xl font-bold leading-tight">{title}</h1>
      {right}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
      {label ? <p className="mt-2 text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}

export function ChoiceButton({
  children,
  onClick,
  state = "idle",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  state?: "idle" | "selected" | "muted";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-[48px] w-full rounded-2xl border-2 px-4 py-3 text-left text-base font-medium transition-[transform,background-color,border-color] duration-150 active:scale-[0.98]",
        state === "selected"
          ? "border-primary bg-primary/10 text-foreground"
          : state === "muted"
            ? "border-border bg-card text-muted-foreground"
            : "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5",
        disabled && "cursor-default",
      )}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhanaCedi({ amount }: { amount: number }) {
  return <span className="font-semibold tabular-nums">GH₵{amount}</span>;
}
