/**
 * Support Signal Badge Component
 * Displays neutral, non-stigmatizing indicators of learner support needs
 */

import { cn } from "@/lib/utils";

export type SupportSignal = "on-track" | "not-started" | "needs-support";

interface SupportSignalBadgeProps {
  signal?: SupportSignal;
  className?: string;
}

const signalConfig: Record<SupportSignal, { label: string; icon: string; color: string }> = {
  "on-track": {
    label: "On track",
    icon: "✓",
    color: "bg-success/10 text-success border-success/20",
  },
  "not-started": {
    label: "Not started",
    icon: "◯",
    color: "bg-muted text-muted-foreground border-border",
  },
  "needs-support": {
    label: "May need support",
    icon: "!",
    color: "bg-warning/10 text-warning border-warning/20",
  },
};

export function SupportSignalBadge({ signal = "on-track", className }: SupportSignalBadgeProps) {
  const config = signalConfig[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold",
        config.color,
        className,
      )}
      title={`Learner status: ${config.label}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
