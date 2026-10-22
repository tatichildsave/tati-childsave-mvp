import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  Monitor,
  PlayCircle,
  PlusCircle,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/tati";
import type { AcademyClass, AcademyCohort, AcademySession, ChildProgressSummary } from "@/lib/academy";
import { getTrack, itemTitle } from "@/lib/learning/track";
import { cn } from "@/lib/utils";

/* Palette sampled from the approved Facilitator Dashboard reference */
const navy = "text-[#13215A]";
const muted = "text-[#6B7489]";
const card =
  "rounded-2xl border border-[#E4E9F2] bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04),0_4px_14px_rgba(16,24,64,0.04)]";
const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C5AD6] focus-visible:ring-offset-2";

const track = getTrack("save");
const DAY = 24 * 60 * 60 * 1000;

export function toMillis(v: unknown): number | null {
  if (!v) return null;
  if (typeof (v as { toMillis?: unknown }).toMillis === "function") return (v as { toMillis: () => number }).toMillis();
  if (v instanceof Date) return v.getTime();
  return null;
}

export function activityLabel(activityId: string, fallbackTitle?: string) {
  const index = track.sequence.findIndex((i) => i.id === activityId);
  const item = track.sequence[index];
  const title = item ? itemTitle(track, item) : (fallbackTitle ?? activityId);
  return index >= 0 ? `Activity ${index + 1}: ${title}` : title;
}

function daysAgoLabel(date: Date | undefined, now: Date) {
  if (!date) return "Not recorded";
  const days = Math.floor((now.getTime() - date.getTime()) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

const CLASS_TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const CLASS_DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const TILE_MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });
const TILE_DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric" });

function classTimeRange(c: AcademyClass) {
  const end = new Date(c.scheduledAt.getTime() + c.durationMinutes * 60_000);
  return `${CLASS_TIME.format(c.scheduledAt)}–${CLASS_TIME.format(end)}`;
}

function DeliveryIcon({ mode, className }: { mode: AcademyClass["deliveryMode"]; className?: string }) {
  const Icon = mode === "virtual" ? Monitor : MapPin;
  return <Icon className={cn("shrink-0", className)} aria-hidden />;
}

function CardHeader({
  id,
  icon,
  title,
  action,
  iconClass = "text-[#13215A]",
}: {
  id: string;
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className={cn("flex min-w-0 items-center gap-2.5 text-[17px] font-extrabold", navy)}>
        <span className={cn("shrink-0", iconClass)} aria-hidden>
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </h2>
      {action}
    </div>
  );
}

function TextLink({ to, search, children }: { to: string; search?: Record<string, string>; children: ReactNode }) {
  return (
    <Link
      to={to}
      {...(search ? { search: search as never } : {})}
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-bold text-[#1C5AD6] hover:underline", focus)}
    >
      {children} <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
    </Link>
  );
}

function ComingSoonLink({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 cursor-default items-center gap-1 text-[13px] font-bold text-[#9AA3B5]" title="Coming soon" aria-disabled="true">
      {children} <ArrowRight className="h-4 w-4" aria-hidden />
      <span className="sr-only">(coming soon)</span>
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Welcome                                                                   */
/* ------------------------------------------------------------------------ */

export function WelcomeHeader({ name, now }: { name: string; now: Date }) {
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name.trim().split(/\s+/)[0] || "there";
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
      <div className="min-w-0">
        <h1 className={cn("text-[26px] font-extrabold leading-tight sm:text-[30px]", navy)}>
          {greeting}, {firstName}{" "}
          <span role="img" aria-label="waving hand">
            👋
          </span>
        </h1>
        <p className={cn("mt-1 text-[15px] font-medium", muted)}>Here's what's happening with your learners today.</p>
      </div>
      <p className={cn("pt-2 text-[14px] font-semibold", muted)}>
        {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Summary cards                                                             */
/* ------------------------------------------------------------------------ */

function SummaryCard({
  tone,
  icon,
  value,
  label,
  caption,
}: {
  tone: "blue" | "green" | "peach" | "purple";
  icon: ReactNode;
  value: string;
  label: string;
  caption: string;
}) {
  const tones = {
    blue: "bg-[#E8F1FD] text-[#1C5AD6]",
    green: "bg-[#E5F5EC] text-[#22A06B]",
    peach: "bg-[#FDEDE6] text-[#E2542C]",
    purple: "bg-[#F0EAFB] text-[#7A4FD6]",
  } as const;
  return (
    <div className={cn("flex min-h-[120px] min-w-0 flex-col rounded-2xl p-4 sm:min-h-[132px] sm:p-5", tones[tone])}>
      <span aria-hidden>{icon}</span>
      <p className={cn("mt-2.5 text-[26px] font-extrabold leading-none tracking-tight sm:mt-3 sm:text-[32px]", navy)}>{value}</p>
      <p className={cn("mt-1.5 text-[14px] font-extrabold leading-tight sm:text-[15px]", navy)}>{label}</p>
      <p className={cn("mt-0.5 text-[12px] font-medium leading-snug sm:text-[13px]", muted)}>{caption}</p>
    </div>
  );
}

export function SummaryCards({
  learners,
  cohortCount,
  averageProgress,
  needSupport,
  sessionsThisWeek,
  sessionsCompletedThisWeek,
}: {
  learners: number;
  cohortCount: number;
  averageProgress: number | null;
  needSupport: number;
  sessionsThisWeek: number;
  sessionsCompletedThisWeek: number;
}) {
  return (
    <section aria-label="Summary" className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
      <SummaryCard
        tone="blue"
        icon={<Users className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} />}
        value={String(learners)}
        label={learners === 1 ? "Learner" : "Learners"}
        caption={`across ${cohortCount} ${cohortCount === 1 ? "cohort" : "cohorts"}`}
      />
      <SummaryCard
        tone="green"
        icon={<BarChart3 className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.6} />}
        value={averageProgress === null ? "—" : `${averageProgress}%`}
        label="Average progress"
        caption={`through ${track.sequence.length} activities`}
      />
      <SummaryCard
        tone="peach"
        icon={<AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} />}
        value={String(needSupport)}
        label="Need support"
        caption="low activity or may need support"
      />
      <SummaryCard
        tone="purple"
        icon={<CalendarDays className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} />}
        value={String(sessionsThisWeek)}
        label={sessionsThisWeek === 1 ? "Session this week" : "Sessions this week"}
        caption={`${sessionsCompletedThisWeek} completed`}
      />
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Today's class                                                             */
/* ------------------------------------------------------------------------ */

const primaryBtn = cn(
  "inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-xl bg-[#13306E] px-4 text-[15px] font-bold text-white transition-colors hover:bg-[#0E2658]",
  focus,
);
const secondaryBtn = cn(
  "inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-[#13306E] bg-white px-4 text-[15px] font-bold text-[#13306E] transition-colors hover:bg-[#F4F8FF]",
  focus,
);

export function TodaysClassCard({
  activeSession,
  nextClass,
  cohorts,
  suggestedActivityId,
  suggestedLearners,
}: {
  activeSession: AcademySession | null;
  nextClass: AcademyClass | null;
  cohorts: AcademyCohort[];
  suggestedActivityId: string | null;
  suggestedLearners: number;
}) {
  const nextCohort = nextClass ? (cohorts.find((c) => c.id === nextClass.cohortId) ?? null) : null;
  const nextLearnerCount = nextCohort?.learnerIds.length ?? 0;
  return (
    <section className={cn("flex flex-col p-5", card)} aria-labelledby="today-title">
      <CardHeader
        id="today-title"
        icon={<CalendarDays className="h-5 w-5" strokeWidth={2.4} />}
        title={activeSession ? "Session in progress" : "Today's Class"}
        action={<TextLink to="/academy/schedule">View full schedule</TextLink>}
      />

      {activeSession ? (
        <>
          <div className="mt-4 flex-1 rounded-xl bg-[#EEF4FD] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className={cn("text-[14px] font-bold", navy)}>
                Started{" "}
                {(() => {
                  const ms = toMillis(activeSession.startedAt);
                  return ms ? new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "earlier";
                })()}
              </p>
              <span className="rounded-full bg-[#1C5AD6] px-3 py-1 text-[12px] font-bold text-white">In progress</span>
            </div>
            <p className={cn("mt-1 text-[18px] font-extrabold", navy)}>{activeSession.cohortName ?? "Current session"}</p>
            <ul className="mt-3 space-y-2 text-[14px] text-[#3D4766]">
              <li className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-[#6B7489]" aria-hidden /> {activeSession.learnerIds.length} learners
              </li>
              <li className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-[#6B7489]" aria-hidden />
                {activityLabel(activeSession.activityId, activeSession.activityTitle)}
              </li>
            </ul>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link to="/academy/session/monitor" search={{ sessionId: activeSession.id } as never} className={primaryBtn}>
              <PlayCircle className="h-5 w-5" aria-hidden /> Resume Session
            </Link>
            <Link to="/academy/session" search={{ activityId: activeSession.activityId } as never} className={secondaryBtn}>
              <BookOpen className="h-5 w-5" aria-hidden /> View Session Guide
            </Link>
          </div>
        </>
      ) : nextClass ? (
        <>
          <div className="mt-4 flex-1 rounded-xl bg-[#EEF4FD] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className={cn("text-[14px] font-bold", navy)}>{classTimeRange(nextClass)}</p>
              <span className="rounded-full bg-[#DDEFE6] px-3 py-1 text-[12px] font-bold text-[#17724F]">Scheduled</span>
            </div>
            <p className={cn("mt-1 break-words text-[18px] font-extrabold", navy)}>{nextCohort?.name ?? "Cohort"}</p>
            <ul className="mt-3 space-y-2 text-[14px] text-[#3D4766]">
              <li className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-[#6B7489]" aria-hidden />
                {nextLearnerCount} {nextLearnerCount === 1 ? "learner" : "learners"}
              </li>
              <li className="flex min-w-0 items-start gap-2.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7489]" aria-hidden />
                <span className="min-w-0 break-words">{activityLabel(nextClass.activityId)}</span>
              </li>
              <li className="flex min-w-0 items-start gap-2.5">
                <DeliveryIcon mode={nextClass.deliveryMode} className="mt-0.5 h-4 w-4 text-[#6B7489]" />
                <span className="min-w-0 break-words">
                  {nextClass.deliveryMode === "virtual" ? "Virtual" : "In person"}
                  {nextClass.location ? `: ${nextClass.location}` : ""}
                </span>
              </li>
            </ul>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/academy/session/start"
              search={{ activityId: nextClass.activityId, cohortId: nextClass.cohortId } as never}
              className={primaryBtn}
            >
              <PlayCircle className="h-5 w-5" aria-hidden /> Start Session
            </Link>
            <Link
              to="/academy/session"
              search={{ activityId: nextClass.activityId } as never}
              className={secondaryBtn}
            >
              <BookOpen className="h-5 w-5" aria-hidden /> View Session Guide
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex-1 rounded-xl bg-[#EEF4FD] p-4">
            <p className={cn("text-[16px] font-extrabold", navy)}>No class scheduled for today</p>
            <p className={cn("mt-1 text-[14px] leading-snug", muted)}>
              You can still start a session now, or{" "}
              <Link to="/academy/schedule" className="font-bold text-[#1C5AD6] hover:underline">
                schedule a class
              </Link>
              .
            </p>
            {suggestedActivityId ? (
              <p className="mt-3 flex items-start gap-2.5 text-[14px] text-[#3D4766]">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7489]" aria-hidden />
                <span>
                  <span className="font-bold text-[#13215A]">Suggested: {activityLabel(suggestedActivityId)}</span>
                  <span className="block text-[13px] text-[#6B7489]">
                    Next step for {suggestedLearners} {suggestedLearners === 1 ? "learner" : "learners"}
                  </span>
                </span>
              </p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/academy/session/start"
              {...(suggestedActivityId ? { search: { activityId: suggestedActivityId } as never } : {})}
              className={primaryBtn}
            >
              <PlayCircle className="h-5 w-5" aria-hidden /> Start Session
            </Link>
            <Link
              to="/academy/session"
              {...(suggestedActivityId ? { search: { activityId: suggestedActivityId } as never } : {})}
              className={secondaryBtn}
            >
              <BookOpen className="h-5 w-5" aria-hidden /> View Session Guide
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Upcoming classes                                                          */
/* ------------------------------------------------------------------------ */

export function UpcomingClassesCard({
  classes,
  cohorts,
}: {
  classes: AcademyClass[];
  cohorts: AcademyCohort[];
}) {
  return (
    <section className={cn("flex flex-col p-5", card)} aria-labelledby="upcoming-title">
      <CardHeader
        id="upcoming-title"
        icon={<CalendarDays className="h-5 w-5" strokeWidth={2.4} />}
        title="Upcoming Classes"
        action={<TextLink to="/academy/schedule">View schedule</TextLink>}
      />
      {classes.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#D7DEEA] bg-[#F9FAFD] px-4 py-8 text-center">
          <CalendarDays className="h-8 w-8 text-[#9AA3B5]" aria-hidden />
          <p className={cn("mt-2 text-[14px] font-extrabold", navy)}>No upcoming classes</p>
          <p className={cn("mt-0.5 max-w-xs text-[13px]", muted)}>
            <Link to="/academy/schedule" className="font-bold text-[#1C5AD6] hover:underline">
              Schedule a class
            </Link>{" "}
            and it will appear here with its time and location.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col divide-y divide-[#EEF1F6]">
          {classes.map((c) => {
            const cohortName = cohorts.find((co) => co.id === c.cohortId)?.name ?? "Cohort";
            return (
              <li key={c.id} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div
                  className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#EEF4FD] text-center"
                  aria-hidden
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#1C5AD6]">
                    {TILE_MONTH.format(c.scheduledAt)}
                  </span>
                  <span className={cn("text-[18px] font-extrabold leading-none", navy)}>
                    {TILE_DAY.format(c.scheduledAt)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("break-words text-[14px] font-extrabold", navy)}>{cohortName}</p>
                  <p className="mt-0.5 text-[13px] text-[#3D4766]">
                    <span className="sr-only">Date: </span>
                    {CLASS_DAY.format(c.scheduledAt)}, {classTimeRange(c)}
                    <span className={muted}> · {c.durationMinutes} min</span>
                  </p>
                  <p className="mt-0.5 flex min-w-0 items-start gap-1.5 text-[13px] text-[#3D4766]">
                    <DeliveryIcon mode={c.deliveryMode} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7489]" />
                    <span className="min-w-0 break-words">
                      {c.deliveryMode === "virtual" ? "Virtual" : "In person"}
                      {c.location ? `: ${c.location}` : ""}
                    </span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Learners needing support                                                  */
/* ------------------------------------------------------------------------ */

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  inactive: { label: "Low activity", className: "bg-[#FDE8E8] text-[#C63B3B]" },
  "needs-support": { label: "May need support", className: "bg-[#FEF3D7] text-[#996100]" },
};

export function SupportListCard({
  learners,
  cohortNameFor,
  now,
}: {
  learners: ChildProgressSummary[];
  cohortNameFor: (childId: string) => string | null;
  now: Date;
}) {
  const sorted = [...learners].sort(
    (a, b) => (a.lastActivityAt?.getTime() ?? 0) - (b.lastActivityAt?.getTime() ?? 0),
  );
  const shown = sorted.slice(0, 5);

  return (
    <section className={cn("@container p-5", card)} aria-labelledby="support-title">
      <CardHeader
        id="support-title"
        icon={<AlertTriangle className="h-5 w-5" strokeWidth={2.4} />}
        iconClass="text-[#D93636]"
        title="Learners needing support"
        action={<TextLink to="/academy/cohorts" search={{ view: "learners" }}>View all</TextLink>}
      />
      {shown.length === 0 ? (
        <div className="mt-4 rounded-xl bg-[#EEF9F2] px-4 py-6 text-center">
          <p className={cn("text-[14px] font-extrabold", navy)}>No learners need extra support right now</p>
          <p className={cn("mt-0.5 text-[13px]", muted)}>Learners with low activity will appear here.</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-[#EEF1F6]">
          {shown.map((l) => {
            const chip = STATUS_CHIP[l.supportSignal] ?? STATUS_CHIP["needs-support"]!;
            return (
              <li key={l.childId}>
                <Link
                  to="/academy/cohorts/$childId"
                  params={{ childId: l.childId }}
                  className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 @min-[470px]:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]", focus)}
                >
                  <Avatar avatar={l.avatar} name={l.childName} size={44} />
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[14.5px] font-extrabold", navy)}>{l.childName}</span>
                    <span className={cn("block truncate text-[13px]", muted)}>{cohortNameFor(l.childId) ?? "Not in a cohort"}</span>
                  </span>
                  <span className={cn("hidden whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-bold @min-[470px]:inline-block", chip.className)}>
                    {chip.label}
                  </span>
                  <span className="hidden text-right text-[12px] leading-tight @min-[470px]:block">
                    <span className={cn("block", muted)}>Last active</span>
                    <span className="block font-bold text-[#D93636]">{daysAgoLabel(l.lastActivityAt, now)}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#6B7489]" aria-hidden />
                  {/* Compact status line on narrow cards */}
                  <span className="col-span-3 -mt-1 flex flex-wrap items-center gap-2 pl-[56px] text-[12px] @min-[470px]:hidden">
                    <span className={cn("rounded-md px-2 py-0.5 font-bold", chip.className)}>{chip.label}</span>
                    <span className={muted}>
                      Last active <span className="font-bold text-[#D93636]">{daysAgoLabel(l.lastActivityAt, now)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Cohorts                                                                   */
/* ------------------------------------------------------------------------ */

export function CohortsCard({
  cohorts,
  progressByChild,
}: {
  cohorts: AcademyCohort[];
  progressByChild: Map<string, ChildProgressSummary>;
}) {
  const shown = cohorts.slice(0, 3);
  return (
    <section className={cn("@container flex flex-col p-5", card)} aria-labelledby="cohorts-title">
      <CardHeader
        id="cohorts-title"
        icon={<Users className="h-5 w-5" strokeWidth={2.4} />}
        title="Cohorts"
        action={<TextLink to="/academy/cohorts" search={{ view: "cohorts" }}>View all</TextLink>}
      />
      {shown.length === 0 ? (
        <p className={cn("mt-4 rounded-xl bg-[#F9FAFD] px-4 py-6 text-center text-[13.5px]", muted)}>
          No cohorts yet. Your administrator assigns learners to you through cohorts.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {shown.map((c) => {
            const members = c.learnerIds.map((id) => progressByChild.get(id)).filter((p): p is ChildProgressSummary => !!p);
            const avg = members.length
              ? Math.round(members.reduce((s, p) => s + p.percentComplete, 0) / members.length)
              : null;
            return (
              <li key={c.id}>
                <Link
                  to="/academy/cohorts"
                  search={{ cohortId: c.id } as never}
                  className={cn("flex items-center gap-3 rounded-xl border border-[#EEF1F6] p-3 hover:border-[#C9D5EC]", focus)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F5EC] text-[#22A06B]">
                    <Users className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[14.5px] font-extrabold", navy)}>{c.name}</span>
                    <span className={cn("block text-[13px]", muted)}>
                      {c.learnerIds.length} {c.learnerIds.length === 1 ? "learner" : "learners"}
                    </span>
                  </span>
                  <span className="hidden w-[38%] items-center gap-2.5 @min-[360px]:flex">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#E6EBF3]" aria-hidden>
                      <span className="block h-full rounded-full bg-[#22A06B]" style={{ width: `${avg ?? 0}%` }} />
                    </span>
                    <span className={cn("w-10 text-right text-[14px] font-extrabold", navy)}>
                      {avg === null ? "—" : `${avg}%`}
                    </span>
                  </span>
                  <span className={cn("text-[14px] font-extrabold @min-[360px]:hidden", navy)}>{avg === null ? "—" : `${avg}%`}</span>
                  <span className="sr-only">average progress</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        to="/academy/cohorts"
        search={{ view: "cohorts" } as never}
        className={cn("mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#F1F4F9] text-[14px] font-bold text-[#13215A] hover:bg-[#E8EDF5]", focus)}
      >
        <PlusCircle className="h-5 w-5" aria-hidden /> View and manage cohorts
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Recent sessions                                                           */
/* ------------------------------------------------------------------------ */

function attendanceOf(s: AcademySession) {
  const present = Object.values(s.attendance ?? {}).filter((v) => v === "present").length;
  return { present, total: s.learnerIds.length };
}

function StatusChip({ status }: { status: string }) {
  const done = status === "completed";
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-[12px] font-bold",
        done ? "bg-[#E3F4EA] text-[#1F7A4C]" : "bg-[#E9F1FE] text-[#1C5AD6]",
      )}
    >
      {done ? "Completed" : "In progress"}
    </span>
  );
}

export function RecentSessionsCard({ sessions }: { sessions: AcademySession[] }) {
  const recent = [...sessions]
    .sort((a, b) => (toMillis(b.startedAt) ?? 0) - (toMillis(a.startedAt) ?? 0))
    .slice(0, 5);
  const dateOf = (s: AcademySession) => {
    const ms = toMillis(s.startedAt);
    return ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  };

  return (
    <section className={cn("p-5", card)} aria-labelledby="recent-title">
      <CardHeader
        id="recent-title"
        icon={<Clock className="h-5 w-5" strokeWidth={2.4} />}
        title="Recent sessions"
        action={<ComingSoonLink>View all</ComingSoonLink>}
      />
      {recent.length === 0 ? (
        <p className={cn("mt-4 rounded-xl bg-[#F9FAFD] px-4 py-6 text-center text-[13.5px]", muted)}>
          No sessions yet. Sessions you run will appear here with attendance.
        </p>
      ) : (
        <>
          {/* Table on tablet and up */}
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-[#EEF1F6] md:block">
            <table className="w-full table-fixed text-left text-[14px]">
              <caption className="sr-only">Five most recent sessions</caption>
              <thead className="bg-[#F4F6FB] text-[13px] font-bold text-[#3D4766]">
                <tr>
                  <th scope="col" className="w-[16%] px-4 py-2.5">Date</th>
                  <th scope="col" className="w-[20%] px-3 py-2.5">Cohort</th>
                  <th scope="col" className="w-[34%] px-3 py-2.5">Activity</th>
                  <th scope="col" className="w-[12%] px-3 py-2.5">Learners</th>
                  <th scope="col" className="w-[14%] px-3 py-2.5">Status</th>
                  <th scope="col" className="w-[4%] px-2 py-2.5"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F6]">
                {recent.map((s) => {
                  const a = attendanceOf(s);
                  return (
                    <tr key={s.id} className="relative hover:bg-[#F9FAFD]">
                      <td className="px-4 py-3 text-[#3D4766]">{dateOf(s)}</td>
                      <td className="truncate px-3 py-3 text-[#3D4766]">{s.cohortName ?? "—"}</td>
                      <td className="truncate px-3 py-3 text-[#3D4766]">
                        <Link
                          to="/academy/session/monitor"
                          search={{ sessionId: s.id } as never}
                          className={cn("after:absolute after:inset-0", focus)}
                        >
                          {activityLabel(s.activityId, s.activityTitle)}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[#3D4766]" title="Present / in session">
                        {a.present} / {a.total}
                      </td>
                      <td className="px-3 py-3"><StatusChip status={s.status} /></td>
                      <td className="px-2 py-3 text-[#6B7489]"><ChevronRight className="h-4 w-4" aria-hidden /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards on mobile */}
          <ul className="mt-3 space-y-2.5 md:hidden">
            {recent.map((s) => {
              const a = attendanceOf(s);
              return (
                <li key={s.id}>
                  <Link
                    to="/academy/session/monitor"
                    search={{ sessionId: s.id } as never}
                    className={cn("block rounded-xl border border-[#EEF1F6] p-3", focus)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("text-[13px] font-semibold", muted)}>{dateOf(s)}</span>
                      <StatusChip status={s.status} />
                    </span>
                    <span className={cn("mt-1 block text-[14.5px] font-extrabold", navy)}>
                      {activityLabel(s.activityId, s.activityTitle)}
                    </span>
                    <span className={cn("mt-0.5 flex items-center gap-3 text-[13px]", muted)}>
                      <span>{s.cohortName ?? "No cohort"}</span>
                      <span>
                        {a.present} / {a.total} present
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
        )}
    </section>
  );
}
