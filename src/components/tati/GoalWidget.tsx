import { cn } from "@/lib/utils";
import { Card } from "./Card";

export function GoalWidget({
  goalLabel,
  targetAmount,
  currentSaved,
  daysTotal,
  dayNumber,
  className,
}: {
  /** e.g., "Oxford blue school bag" */
  goalLabel: string;
  /** e.g., 80 */
  targetAmount: number;
  /** Current amount saved (cedis) */
  currentSaved: number;
  /** Total days in journey (e.g., 14) */
  daysTotal: number;
  /** Current day number */
  dayNumber: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((currentSaved / targetAmount) * 100));
  const daysLeft = Math.max(0, daysTotal - dayNumber + 1);

  return (
    <Card tone="primary" className={cn("text-white", className)}>
      <div className="space-y-3">
        {/* Header with title and percentage */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold opacity-90">My Money Goal</p>
            <p className="mt-1 truncate text-base font-extrabold">{goalLabel}</p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
            {pct}%
          </span>
        </div>

        {/* Amount display */}
        <div className="space-y-1">
          <p className="text-2xl font-extrabold">
            GH₵{currentSaved}
            <span className="text-base font-bold opacity-90"> of GH₵{targetAmount}</span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Goal progress: ${currentSaved} of ${targetAmount} cedis`}
          />
        </div>

        {/* Days left */}
        <p className="text-sm font-semibold opacity-90">
          ⏱️ {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </p>
      </div>
    </Card>
  );
}
