import type { SkillGrowth } from "@/lib/learning/growth";
import { cn } from "@/lib/utils";

const WORDS: Record<SkillGrowth["strength"], string> = {
  growing: "Growing",
  strong: "Strong",
  super: "Super strong",
};

/**
 * Visual skill picture for a child. Shows how full each skill bar is and whether it
 * grew — never a school-style percentage.
 */
export function SkillBars({
  skills,
  tone = "strength",
}: {
  skills: SkillGrowth[];
  tone?: "strength" | "growing";
}) {
  if (skills.length === 0) return null;
  return (
    <ul className="space-y-3">
      {skills.map((s) => (
        <li key={s.competency}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-bold">{s.label}</p>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-extrabold",
                tone === "growing"
                  ? "bg-accent-soft text-accent-foreground"
                  : "bg-success-soft text-success",
              )}
            >
              {tone === "growing" ? "Still growing" : WORDS[s.strength]}
              {s.grew ? " ↑" : ""}
            </span>
          </div>
          <div
            className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${s.label}: ${tone === "growing" ? "still growing" : WORDS[s.strength].toLowerCase()}`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
                tone === "growing" ? "bg-accent" : "bg-success",
              )}
              style={{ width: `${Math.max(8, Math.round(s.after * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
