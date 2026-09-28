import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { ProgressSnapshot } from "@/lib/progress/snapshot";
import { Card } from "./Card";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { itemTitle, getTrack } from "@/lib/learning/track";

export function NextStepCard({
  snapshot,
  className,
}: {
  snapshot: ProgressSnapshot;
  className?: string;
}) {
  const nextState = useMemo(() => {
    if (!snapshot) return null;

    const track = getTrack("save");

    // If journey is complete, show results
    if (snapshot.journey.complete) {
      return {
        label: "View Your Learning Summary",
        description: "See your journey, badges and growth",
        route: "/child/results",
        action: "View results →",
        icon: "🎉",
      };
    }

    // If post-assessment is ready and not done, show it
    if (snapshot.assessments.postReady && !snapshot.assessments.postDone) {
      return {
        label: "Take Your Final Check-In",
        description: "See how your thinking about money has grown",
        route: "/child/assessment/save-post",
        action: "Start check-in →",
        icon: "🌟",
      };
    }

    // If pre-assessment not done, show it
    if (!snapshot.assessments.preDone) {
      return {
        label: "Begin Your Adventure",
        description: "Tell TATI how you think about money today",
        route: "/child/assessment/save-pre",
        action: "Start →",
        icon: "🧠",
      };
    }

    // Otherwise, find the next incomplete item
    if (snapshot.currentItem) {
      const item = snapshot.currentItem;
      const isCurrent = snapshot.steps.find((s) => s.current);
      const title = itemTitle(track, item);

      if (item.kind === "lesson") {
        return {
          label: isCurrent ? "Continue Your Lesson" : "Start Your Lesson",
          description: title,
          route: `/child/lesson/${item.id}`,
          action: "Continue →",
          icon: "📚",
        };
      }

      if (item.kind === "scenario") {
        return {
          label: isCurrent ? "Continue Your Story" : "Start Your Decision Story",
          description: title,
          route: `/child/scenario/${item.id}`,
          action: "Continue →",
          icon: "💭",
        };
      }

      if (item.kind === "reflection") {
        return {
          label: "Reflect on Your Journey",
          description: title,
          route: `/child/reflection/${item.id}`,
          action: "Reflect →",
          icon: "🪞",
        };
      }
    }

    // Fallback: view journey map
    return {
      label: "View Your Journey",
      description: "See all the activities you have ahead",
      route: "/child/learn",
      action: "View journey →",
      icon: "🗺️",
    };
  }, [snapshot]);

  if (!nextState) return null;

  return (
    <Card tone="surface" className={cn("overflow-hidden", className)}>
      <Link
        to={nextState.route}
        className={cn(
          "block rounded-3xl border border-transparent transition-all duration-200",
          "hover:border-primary/30 hover:shadow-md active:scale-[0.98]",
        )}
      >
        <div className="flex items-start gap-4 p-1">
          <span className="flex-shrink-0 text-3xl">{nextState.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase text-muted-foreground">What next?</p>
            <p className="mt-1 text-base font-extrabold text-foreground">{nextState.label}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{nextState.description}</p>
            <p className="mt-3 inline-flex items-center gap-2 font-bold text-primary">
              {nextState.action}
              <span aria-hidden="true">›</span>
            </p>
          </div>
        </div>
      </Link>
    </Card>
  );
}
