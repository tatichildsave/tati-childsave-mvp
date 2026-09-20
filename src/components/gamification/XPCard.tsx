import type { GamificationState } from "@/lib/gamification/types";
import { AnimatedNumber } from "./AnimatedNumber";

/** Quiet progress panel: XP, level, journey progress and a streak-ready day count. */
export function XPCard({ state }: { state: GamificationState }) {
  return (
    <section className="mb-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your progress</p>
          <p className="text-lg font-bold">
            <span aria-hidden="true">⭐</span> Level {state.level} · {state.levelLabel}
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent-foreground tabular-nums">
          <AnimatedNumber value={state.xp} suffix=" XP" className="tati-value-pop inline-block" />
        </span>
      </div>

      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={state.levelPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress to the next level"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${state.levelPct}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
            <AnimatedNumber value={state.xpIntoLevel} />/{state.xpForLevel} XP towards Level {state.level + 1}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Steps done" value={`${state.journey.done}/${state.journey.total}`} />
        <Stat label="Badges" value={`${state.earnedBadges.length}`} />
        <Stat
          label="Day streak"
          value={state.streak.currentDays > 0 ? `🔥 ${state.streak.currentDays}` : "—"}
        />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-2 py-3 text-secondary-foreground">
      <p className="text-base font-extrabold tabular-nums">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
