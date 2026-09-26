/**
 * Learner Roster Component
 * Displays a table/list of learners with their progress for a cohort
 */

import type { ReactNode } from "react";
import { Avatar } from "@/components/tati";
import { cn } from "@/lib/utils";
import { SupportSignalBadge, type SupportSignal } from "./SupportSignalBadge";

export interface RosterItem {
  id: string;
  name: string;
  avatar: string;
  status: "not-started" | "in-progress" | "completed";
  progressPercent: number;
  currentActivity?: string;
  supportSignal?: SupportSignal;
  action?: ReactNode;
}

interface LearnerRosterProps {
  learners: RosterItem[];
  className?: string;
  onLearnerClick?: (id: string) => void;
}

export function LearnerRoster({ learners, className, onLearnerClick }: LearnerRosterProps) {
  if (learners.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
        <p className="text-base font-bold text-foreground">No learners enrolled</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Learners will appear here when enrolled in this cohort.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {learners.map((learner) => (
        <div
          key={learner.id}
          className="rounded-xl border border-border bg-card p-3 transition-colors hover:bg-card/80"
          onClick={() => onLearnerClick?.(learner.id)}
          role={onLearnerClick ? "button" : undefined}
          tabIndex={onLearnerClick ? 0 : undefined}
        >
          <div className="flex items-center gap-3">
            <Avatar avatar={learner.avatar} name={learner.name} size="sm" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground">{learner.name}</h4>
              {learner.currentActivity && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {learner.currentActivity}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${learner.progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground">
                  {Math.round(learner.progressPercent)}%
                </span>
              </div>
            </div>
            {learner.supportSignal && (
              <SupportSignalBadge signal={learner.supportSignal} className="flex-shrink-0" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
