import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { MoneyDisplay } from "./Badge";
import { toneClasses, type Tone } from "@/lib/theme";

export type ItemStatus = "locked" | "ready" | "in-progress" | "done";

const statusLabel: Record<ItemStatus, string> = {
  locked: "Locked",
  ready: "Ready to learn",
  "in-progress": "In progress",
  done: "Completed",
};

const statusTone: Record<ItemStatus, Tone> = {
  locked: "neutral",
  ready: "success",
  "in-progress": "primary",
  done: "success",
};

export function LessonCard({
  index,
  title,
  subtitle,
  minutes,
  status = "ready",
  to,
  params,
}: {
  index: number;
  title: string;
  subtitle?: string;
  minutes?: number;
  status?: ItemStatus;
  to?: string;
  params?: Record<string, string>;
}) {
  const body = (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl p-4 text-left",
        status === "locked" ? "bg-muted" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-extrabold",
          status === "locked"
            ? "bg-card text-muted-foreground"
            : "bg-primary text-primary-foreground",
        )}
        aria-hidden="true"
      >
        {status === "locked" ? "🔒" : index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-extrabold">{title}</span>
        <span className="block truncate text-sm font-bold text-muted-foreground">
          {subtitle ?? statusLabel[status]}
          {minutes ? ` · ${minutes} min` : ""}
        </span>
      </span>
      <span aria-hidden="true" className="text-lg text-primary">
        {status === "locked" ? "🔒" : "▶"}
      </span>
    </div>
  );

  if (to && status !== "locked") {
    return (
      <Link to={to} {...(params ? { params } : {})} className="block min-h-[48px]">
        {body}
      </Link>
    );
  }
  return <div aria-disabled={status === "locked"}>{body}</div>;
}

export function ScenarioCard({
  title,
  description,
  track = "SAVE",
  pocket,
  target,
  days,
  status = "ready",
  to,
  params,
}: {
  title: string;
  description: string;
  track?: string;
  pocket?: number;
  target?: number;
  days?: number;
  status?: ItemStatus;
  to?: string;
  params?: Record<string, string>;
}) {
  return (
    <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success" solid icon="📈">
          Track: {track}
        </Badge>
        {days ? (
          <span className="rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-extrabold">
            ⏱ {days} simulated days
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-2xl font-extrabold leading-tight">{title}</h3>
      <p className="mt-2 text-base text-primary-foreground/85">{description}</p>

      {(pocket !== undefined || target !== undefined) && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-primary-foreground/10 p-4">
          {pocket !== undefined ? (
            <div>
              <p className="text-sm font-bold text-primary-foreground/80">In pocket</p>
              <p className="text-xl font-extrabold tabular-nums">GH₵{pocket}</p>
            </div>
          ) : null}
          {target !== undefined ? (
            <div>
              <p className="text-sm font-bold text-primary-foreground/80">Goal</p>
              <p className="text-xl font-extrabold tabular-nums">GH₵{target}</p>
            </div>
          ) : null}
        </div>
      )}

      {to ? (
        <Link
          to={to}
          {...(params ? { params } : {})}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-success text-base font-extrabold text-success-foreground"
        >
          {status === "done" ? "Play again" : "Start challenge"} →
        </Link>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  money,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value?: ReactNode;
  money?: number;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-card p-4 text-center shadow-card", className)}>
      {icon ? (
        <span
          aria-hidden="true"
          className={cn(
            "mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-lg",
            toneClasses[tone],
          )}
        >
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      {money !== undefined ? (
        <MoneyDisplay
          amount={money}
          tone={tone === "success" ? "success" : tone === "warning" ? "accent" : "primary"}
        />
      ) : (
        <p className="text-xl font-extrabold">{value}</p>
      )}
    </div>
  );
}
