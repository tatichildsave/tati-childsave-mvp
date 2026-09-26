/**
 * Activity Card Component
 * Displays a single learning activity (lesson, scenario, assessment, reflection)
 * for the facilitator dashboard and cohort view
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tatiTheme } from "@/lib/theme";

export interface ActivityCardProps {
  title: string;
  type: "lesson" | "scenario" | "assessment" | "reflection";
  duration?: string;
  status?: "ready" | "in-progress" | "completed";
  description?: string;
  action?: ReactNode;
  className?: string;
}

const typeIcons: Record<ActivityCardProps["type"], string> = {
  lesson: "📖",
  scenario: "🎯",
  assessment: "✓",
  reflection: "💭",
};

const typeLabels: Record<ActivityCardProps["type"], string> = {
  lesson: "Lesson",
  scenario: "Scenario",
  assessment: "Assessment",
  reflection: "Reflection",
};

const statusStyles = {
  ready: "bg-success/10 text-success border-success/20",
  "in-progress": "bg-warning/10 text-warning border-warning/20",
  completed: "bg-muted text-muted-foreground border-border",
};

export function ActivityCard({
  title,
  type,
  duration,
  status = "ready",
  description,
  action,
  className,
}: ActivityCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        "bg-card text-foreground hover:bg-card/80",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{typeIcons[type]}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold leading-tight">{title}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {typeLabels[type]}
            {duration && <> · {duration}</>}
          </p>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
          {status !== "ready" && (
            <div className={cn("mt-2 inline-block rounded px-2 py-1 text-xs font-bold", statusStyles[status])}>
              {status === "in-progress" && "In progress"}
              {status === "completed" && "Completed"}
            </div>
          )}
        </div>
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
