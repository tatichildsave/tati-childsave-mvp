import { cn } from "@/lib/utils";

export function ChapterBanner({
  stage,
  dayNumber,
  daysTotal,
  className,
}: {
  /** e.g., "Chapter 2 — Market Day" */
  stage: string;
  /** Current day in journey */
  dayNumber: number;
  /** Total days (e.g., 14) */
  daysTotal: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between rounded-2xl bg-primary-soft px-4 py-3 text-primary",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide opacity-80">{stage}</p>
        <p className="mt-1 text-sm font-bold">
          Day {dayNumber} of {daysTotal}
        </p>
      </div>
      <span className="ml-3 flex-shrink-0 text-lg" aria-hidden="true">
        📖
      </span>
    </div>
  );
}
