import { cn } from "@/lib/utils";

export function LearningObjectiveBadge({
  objective,
  className,
}: {
  objective: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-primary-soft px-4 py-3 text-primary", className)}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">You're learning</p>
      <p className="mt-1 text-sm font-semibold leading-relaxed">{objective}</p>
    </div>
  );
}
