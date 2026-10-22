import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  ChevronRight,
  PiggyBank,
  Trophy,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/tati";
import type { ChildProfile } from "@/lib/family";
import { useChildProgress } from "@/lib/progress/service";
import { cn } from "@/lib/utils";
import { parentTheme as t } from "./theme";

const AVATAR_BACKDROPS = ["bg-[#DCEBFB]", "bg-[#FCE3EC]", "bg-[#E2F4EA]", "bg-[#FFF1D6]"];
const VISIBLE_CHILDREN = 2;
// Four tiles side by side only when the card is wide enough; otherwise a 2-column layout.
const STATS_GRID =
  "mt-4 grid grid-cols-2 gap-3 @min-[740px]:grid-cols-[1.4fr_0.95fr_1.05fr_1.45fr]";

interface MyChildrenCardProps {
  profiles: ChildProfile[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedId: string | undefined;
  onSelect: (childId: string) => void;
}

export function MyChildrenCard({
  profiles,
  isLoading,
  isError,
  onRetry,
  selectedId,
  onSelect,
}: MyChildrenCardProps) {
  const [showAll, setShowAll] = useState(false);
  const list = profiles ?? [];
  const canSwitch = list.length > 1;
  const visible = showAll ? list : list.slice(0, VISIBLE_CHILDREN);
  const selectedHidden = !!selectedId && !visible.some((c) => c.id === selectedId);
  const shown = selectedHidden
    ? [...visible.slice(0, VISIBLE_CHILDREN - 1), list.find((c) => c.id === selectedId)!]
    : visible;

  function switchChild() {
    if (!canSwitch) return;
    const i = list.findIndex((c) => c.id === selectedId);
    const next = list[(i + 1) % list.length];
    if (next) onSelect(next.id);
  }

  return (
    <section
      id="my-children"
      aria-labelledby="my-children-title"
      className={cn("@container scroll-mt-24 p-4 sm:p-5", t.card)}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-[min(100%,300px)] flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3F4EA] text-[#2E9E62]">
            <Users className="h-[21px] w-[21px]" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="my-children-title" className={cn("text-[17px] font-extrabold leading-tight", t.navy)}>
              My Children
            </h2>
            <p className={cn("text-[13px] font-medium leading-snug", t.muted)}>
              Select a child to view their progress and details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {list.length > VISIBLE_CHILDREN ? (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md text-[13px] font-bold text-[#1C5AD6] hover:underline",
                t.focus,
              )}
            >
              {showAll ? "Show less" : "View All"}
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={switchChild}
            disabled={!canSwitch}
            title={canSwitch ? "Switch to the next child" : "Only one child is linked to your family"}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg bg-[#1C5AD6] px-3.5 text-[13px] font-bold text-white shadow-[0_2px_6px_rgba(28,90,214,0.22)] transition-colors hover:bg-[#174DBA] disabled:cursor-not-allowed disabled:bg-[#A9BEE8] disabled:shadow-none",
              t.focus,
            )}
          >
            <ArrowLeftRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            Switch Child
          </button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="mt-4 rounded-xl border border-[#F3D2D2] bg-[#FFF6F6] p-4 text-[14px]">
          <p className="font-bold text-[#B42318]">We couldn't load your children.</p>
          <p className={cn("mt-0.5", t.muted)}>Check your connection and try again.</p>
          <button
            type="button"
            onClick={onRetry}
            className={cn("mt-3 rounded-lg bg-white px-3 py-1.5 font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4]", t.focus)}
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#D7DEEA] bg-[#F9FAFD] px-5 py-8 text-center">
          <p className={cn("text-[15px] font-extrabold", t.navy)}>No children linked yet</p>
          <p className={cn("mx-auto mt-1 max-w-md text-[13.5px]", t.muted)}>
            Children are added to your family by your TATI programme administrator. If a child is
            missing, please contact your administrator.
          </p>
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Choose a child"
            className="mt-4 grid grid-cols-1 gap-3 @min-[520px]:grid-cols-2 @min-[520px]:gap-4"
          >
            {shown.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                backdrop={AVATAR_BACKDROPS[list.indexOf(child) % AVATAR_BACKDROPS.length]!}
                selected={child.id === selectedId}
                onSelect={() => onSelect(child.id)}
              />
            ))}
          </div>

          {selectedId ? <ChildStats childId={selectedId} /> : null}
        </>
      )}
    </section>
  );
}

function ChildCard({
  child,
  backdrop,
  selected,
  onSelect,
}: {
  child: ChildProfile;
  backdrop: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const details = [`Age ${child.age}`, child.curriculum_level].filter(Boolean).join("  ·  ");

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-2xl border bg-white p-3 pr-2 transition-shadow sm:p-3.5",
        selected
          ? "border-[#1C5AD6] shadow-[0_0_0_1px_#1C5AD6,0_6px_16px_rgba(28,90,214,0.10)]"
          : "border-[#E4E9F2] hover:border-[#C9D5EC]",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Show ${child.name}'s progress`}
        onClick={onSelect}
        className={cn("flex min-w-0 flex-1 items-center gap-4 rounded-xl text-left", t.focus)}
      >
        <span className={cn("flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full", backdrop)}>
          <Avatar avatar={child.avatar} name={child.name} size={64} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[17px] font-extrabold leading-tight", t.navy)}>
            {child.name}
          </span>
          {child.tati_id ? (
            <span className={cn("mt-1 block truncate text-[13px] font-semibold", t.muted)}>
              TATI ID: {child.tati_id}
            </span>
          ) : null}
          <span className={cn("mt-0.5 block truncate text-[13px] font-medium", t.muted)}>{details}</span>
        </span>
      </button>
      <Link
        to="/parent/child/$childId"
        params={{ childId: child.id }}
        aria-label={`Open ${child.name}'s learning details`}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1C5AD6] transition-colors hover:bg-[#EEF3FD]",
          t.focus,
        )}
      >
        <ChevronRight className="h-6 w-6" strokeWidth={2.4} aria-hidden />
      </Link>
    </div>
  );
}

function ChildStats({ childId }: { childId: string }) {
  const progress = useChildProgress(childId);
  const { game, steps, track, journey, currentItem } = progress;
  const total = game.journey.total || steps.length;
  const done = game.journey.done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const daysTotal = track.goal?.daysTotal ?? 14;
  const daysDone = Math.max(0, daysTotal - journey.daysToGo);
  const current = currentItem ? steps.find((s) => s.item === currentItem) : undefined;

  if (progress.isLoading) {
    return (
      <div className={STATS_GRID} aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-[#F1F4F9]" />
        ))}
      </div>
    );
  }

  return (
    <div className={STATS_GRID} aria-live="polite">
      {/* Learning progress */}
      <StatTile className="col-span-2 @min-[740px]:col-span-1">
        <ProgressDonut pct={pct} />
        <div className="min-w-0">
          <p className={cn("text-[14px] font-extrabold leading-tight", t.navy)}>Learning Progress</p>
          <p className={cn("mt-1 text-[13px] font-medium leading-snug", t.muted)}>
            {done} of {total} adventures completed
          </p>
        </div>
      </StatTile>

      {/* Badges */}
      <StatTile>
        <IconTile className="bg-[#FFF3D4] text-[#F2A514]">
          <Trophy className="h-[21px] w-[21px]" strokeWidth={2.3} aria-hidden />
        </IconTile>
        <Metric label="Badges" value={String(game.earnedBadges.length)} caption="earned" />
      </StatTile>

      {/* SAVE journey */}
      <StatTile>
        <IconTile className="bg-[#FDE6EC] text-[#E5537A]">
          <PiggyBank className="h-[21px] w-[21px]" strokeWidth={2.3} aria-hidden />
        </IconTile>
        <Metric label="SAVE Journey" value={`${daysDone} / ${daysTotal}`} caption="days completed" />
      </StatTile>

      {/* Current adventure */}
      <StatTile className="col-span-2 @min-[740px]:col-span-1">
        <IconTile className="bg-[#E2F4EA] text-[#2E9E62]">
          <BarChart3 className="h-[21px] w-[21px]" strokeWidth={2.4} aria-hidden />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[12px] font-semibold leading-tight", t.muted)}>Current Adventure</p>
          {current ? (
            <>
              <p className={cn("mt-0.5 text-[16px] font-extrabold leading-tight", t.navy)}>
                Adventure {current.index + 1}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-snug text-[#1C5AD6]">
                {current.title}
              </p>
            </>
          ) : (
            <p className={cn("mt-0.5 text-[15px] font-extrabold leading-tight", t.navy)}>
              {journey.complete ? "Journey complete" : "Not started yet"}
            </p>
          )}
        </div>
        <Link
          to="/parent/child/$childId"
          params={{ childId }}
          aria-label="View learning journey details"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF1FD] text-[#1C5AD6] transition-colors hover:bg-[#DCE7FB]",
            t.focus,
          )}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.6} aria-hidden />
        </Link>
      </StatTile>
    </div>
  );
}

function StatTile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-[100px] min-w-0 items-center gap-2.5 rounded-2xl border border-[#E4E9F2] bg-white px-3 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

function IconTile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", className)}>
      {children}
    </span>
  );
}

function Metric({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="min-w-0">
      <p className={cn("truncate text-[12px] font-semibold leading-tight", t.muted)}>{label}</p>
      <p className={cn("mt-1 text-[22px] font-extrabold leading-none tracking-tight", t.navy)}>{value}</p>
      <p className={cn("mt-1 truncate text-[12px] font-medium leading-tight", t.muted)}>{caption}</p>
    </div>
  );
}

function ProgressDonut({ pct }: { pct: number }) {
  const size = 84;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${pct}% of the learning journey completed`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6ECF5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#22A06B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-[19px] font-extrabold", t.navy)}>
        {pct}%
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading your children">
      <div className="grid grid-cols-1 gap-3 @min-[520px]:grid-cols-2 @min-[520px]:gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex h-[98px] animate-pulse items-center gap-4 rounded-2xl border border-[#EEF1F6] p-3.5">
            <span className="h-[72px] w-[72px] rounded-full bg-[#EEF2F8]" />
            <span className="flex-1 space-y-2">
              <span className="block h-4 w-2/3 rounded bg-[#EEF2F8]" />
              <span className="block h-3 w-1/2 rounded bg-[#F2F5FA]" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
