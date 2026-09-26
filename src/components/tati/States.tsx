import type { ReactNode } from "react";
import { Button } from "./Button";

export function LoadingState({ label = "Getting things ready…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-6">
      <p className="text-center text-base font-bold text-muted-foreground">{label}</p>
      <div className="h-24 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
    </div>
  );
}

export function AuthLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-card"
      >
        <p className="text-base font-extrabold text-primary">Checking your TATI session…</p>
        <p className="mt-2 text-base text-muted-foreground">
          Your family space will open in a moment.
        </p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "🌱",
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-card p-8 text-center shadow-card">
      <span aria-hidden="true" className="text-4xl">
        {icon}
      </span>
      <h2 className="mt-3 text-lg font-extrabold">{title}</h2>
      {description ? <p className="mt-2 text-base text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "This didn't load",
  description = "Something went wrong on our side. Let's try that again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-3xl bg-card p-8 text-center shadow-card">
      <span aria-hidden="true" className="text-4xl">
        🧯
      </span>
      <h2 className="mt-3 text-lg font-extrabold">{title}</h2>
      <p className="mt-2 text-base text-muted-foreground">{description}</p>
      {onRetry ? (
        <div className="mt-5">
          <Button onClick={onRetry} variant="outline">
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
