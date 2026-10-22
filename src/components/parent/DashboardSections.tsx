import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  Link2,
  Lock,
  MessageSquareHeart,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import type { ChildProfile } from "@/lib/family";
import type { ChildProgressResult } from "@/lib/progress/service";
import { cn } from "@/lib/utils";
import { parentTheme as t } from "./theme";

type Progress = ChildProgressResult | null;

const firstNameOf = (child: ChildProfile | null) => child?.name.trim().split(/\s+/)[0] ?? "Your child";

/* ------------------------------------------------------------------------ */
/* Shared card chrome                                                        */
/* ------------------------------------------------------------------------ */

function SectionCard({
  id,
  title,
  subtitle,
  icon,
  iconTone,
  action,
  className,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  iconTone: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("@container flex min-w-0 scroll-mt-24 flex-col p-4 sm:p-5", t.card, className)}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconTone)}>{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className={cn("text-[16px] font-extrabold leading-tight sm:text-[17px]", t.navy)}>
            {title}
          </h2>
          {subtitle ? <p className={cn("mt-0.5 text-[13px] font-medium leading-snug", t.muted)}>{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

function ViewAllLink({ childId, label = "View All" }: { childId: string; label?: string }) {
  return (
    <Link
      to="/parent/child/$childId"
      params={{ childId }}
      className={cn("inline-flex items-center gap-1 rounded-md text-[13px] font-bold text-[#1C5AD6] hover:underline", t.focus)}
    >
      {label} <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
    </Link>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[96px] items-center justify-center rounded-xl border border-dashed border-[#D7DEEA] bg-[#F9FAFD] px-4 py-6 text-center text-[13.5px] text-[#6B7489]">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Next class / Academy                                                      */
/* ------------------------------------------------------------------------ */

export function NextClassCard() {
  return (
    <SectionCard
      id="next-class"
      title="Next Class / Academy"
      icon={<CalendarDays className="h-5 w-5" strokeWidth={2.3} aria-hidden />}
      iconTone="bg-[#EFEAFD] text-[#6E4FD8]"
    >
      <div className="flex items-start gap-3 rounded-xl bg-[#F4F8FF] p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1C5AD6] shadow-sm">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={cn("text-[14px] font-extrabold", t.navy)}>No classes scheduled yet</p>
          <p className={cn("mt-0.5 text-[13px] leading-snug", t.muted)}>
            When your child's TATI Academy class is scheduled, the date, time and location will appear here.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------ */
/* 14-day SAVE journey                                                       */
/* ------------------------------------------------------------------------ */

export function SaveJourneyCard({ child, progress }: { child: ChildProfile | null; progress: Progress }) {
  const daysTotal = progress?.track.goal?.daysTotal ?? 14;
  const daysDone = progress ? Math.max(0, daysTotal - progress.journey.daysToGo) : 0;

  return (
    <SectionCard
      id="save-journey"
      title={`${daysTotal}-Day SAVE Journey`}
      subtitle="Small steps. Big habits."
      icon={<Star className="h-5 w-5" strokeWidth={2.3} aria-hidden />}
      iconTone="bg-[#FFF3D4] text-[#E59A0B]"
      action={child ? <ViewAllLink childId={child.id} label="View Details" /> : undefined}
    >
      {!child || !progress ? (
        <Placeholder>The SAVE journey appears once a child is linked to your family.</Placeholder>
      ) : progress.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-[#F1F4F9]" aria-busy="true" />
      ) : (
        <>
          <ol
            className="grid grid-cols-7 gap-x-1.5 gap-y-3 @min-[330px]:grid-cols-[repeat(14,minmax(0,1fr))]"
            aria-label={`${daysDone} of ${daysTotal} days completed`}
          >
            {Array.from({ length: daysTotal }, (_, i) => {
              const done = i < daysDone;
              return (
                <li key={i} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex aspect-square w-full max-w-[24px] items-center justify-center rounded-full",
                      done ? "bg-[#22A06B] text-white" : "bg-[#E6EBF3]",
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3.5} /> : null}
                  </span>
                  <span className={cn("text-[11px] font-semibold", done ? "text-[#13215A]" : "text-[#8A93A8]")}>
                    {i + 1}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#EEF9F2] px-4 py-3">
            <Trophy className="h-7 w-7 shrink-0 text-[#E59A0B]" aria-hidden />
            <div className="min-w-0">
              <p className={cn("text-[14px] font-extrabold", t.navy)}>
                {daysDone === 0 ? "Ready to begin" : daysDone >= daysTotal ? "Journey complete!" : "Great job!"}
              </p>
              <p className="text-[13px] text-[#3D4766]">
                {daysDone === 0
                  ? `Day 1 starts with ${firstNameOf(child)}'s first adventure.`
                  : `${firstNameOf(child)} has completed ${daysDone} out of ${daysTotal} days.`}
              </p>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------ */
/* Learning journey strip                                                    */
/* ------------------------------------------------------------------------ */

const WINDOW = 6;

export function LearningJourneyCard({ child, progress }: { child: ChildProfile; progress: ChildProgressResult }) {
  const steps = progress.steps;
  const current = steps.findIndex((s) => s.current);
  const anchor = current === -1 ? steps.length - 1 : current;
  const defaultStart = Math.min(Math.max(0, anchor - (WINDOW - 2)), Math.max(0, steps.length - WINDOW));
  const [start, setStart] = useState<number | null>(null);
  const from = start ?? defaultStart;
  const visible = steps.slice(from, from + WINDOW);
  const name = firstNameOf(child);

  return (
    <SectionCard
      id="learning-journey"
      title={`${name}'s Learning Journey`}
      subtitle={`Follow their progress through ${steps.length} adventures.`}
      icon={<GraduationCap className="h-5 w-5" strokeWidth={2.3} aria-hidden />}
      iconTone="bg-[#E9F1FE] text-[#1C5AD6]"
      action={<ViewAllLink childId={child.id} />}
    >
      {progress.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-[#F1F4F9]" aria-busy="true" />
      ) : (
        <div className="flex items-start gap-1.5">
          <PagerButton
            direction="prev"
            disabled={from === 0}
            onClick={() => setStart(Math.max(0, from - WINDOW))}
          />
          <ol className="grid min-w-0 flex-1 grid-cols-3 gap-y-4 @min-[460px]:grid-cols-6" aria-label="Adventure steps">
            {visible.map((s, i) => (
              <li key={s.item.id} className="relative flex flex-col items-center px-1 text-center">
                {i < visible.length - 1 ? (
                  <span
                    className={cn(
                      "absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-[17px] hidden h-0.5 @min-[460px]:block",
                      s.done ? "bg-[#9FD9BE]" : "bg-[#E1E7F0]",
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-extrabold",
                    s.done && "bg-[#22A06B] text-white",
                    s.current && "bg-[#1C5AD6] text-white ring-4 ring-[#DCE7FB]",
                    !s.done && !s.current && "border-2 border-[#DDE3EC] bg-white text-[#9AA3B5]",
                  )}
                  aria-hidden
                >
                  {s.done ? (
                    <Check className="h-4 w-4" strokeWidth={3.2} />
                  ) : s.current ? (
                    <BookOpen className="h-4 w-4" strokeWidth={2.4} />
                  ) : (
                    <Lock className="h-3.5 w-3.5" strokeWidth={2.4} />
                  )}
                </span>
                <span className={cn("mt-1.5 text-[11px] font-bold", t.muted)}>{s.index + 1}</span>
                <span
                  className={cn(
                    "line-clamp-2 text-[11.5px] font-semibold leading-tight",
                    s.current ? "text-[#1C5AD6]" : s.done ? "text-[#13215A]" : "text-[#8A93A8]",
                  )}
                >
                  {s.title}
                </span>
                <span className="sr-only">{s.done ? "completed" : s.current ? "current adventure" : "not started"}</span>
              </li>
            ))}
          </ol>
          <PagerButton
            direction="next"
            disabled={from + WINDOW >= steps.length}
            onClick={() => setStart(Math.min(Math.max(0, steps.length - WINDOW), from + WINDOW))}
          />
        </div>
      )}
    </SectionCard>
  );
}

function PagerButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Earlier adventures" : "Later adventures"}
      className={cn(
        "mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E1E7F0] bg-white text-[#1C5AD6] transition-opacity hover:bg-[#F4F8FF] disabled:opacity-30",
        t.focus,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.6} aria-hidden />
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* Achievements                                                              */
/* ------------------------------------------------------------------------ */

const BADGE_TONES = [
  { fill: "#2FAE7A", ring: "#1F8A5E" },
  { fill: "#F27FA0", ring: "#D85A7E" },
  { fill: "#F5C24A", ring: "#E0A21B" },
  { fill: "#5B8DEF", ring: "#3C6FD6" },
] as const;

export function AchievementsCard({ child, progress }: { child: ChildProfile; progress: ChildProgressResult }) {
  const [showAll, setShowAll] = useState(false);
  const badges = [...progress.game.badges].sort((a, b) => Number(b.earned) - Number(a.earned));
  const earned = badges.filter((b) => b.earned).length;
  const visible = showAll ? badges : badges.slice(0, 3);

  return (
    <SectionCard
      id="achievements"
      title="Achievements"
      subtitle={`Badges and milestones ${firstNameOf(child)} has earned (${earned} of ${badges.length}).`}
      icon={<Trophy className="h-5 w-5" strokeWidth={2.3} aria-hidden />}
      iconTone="bg-[#FFF3D4] text-[#E59A0B]"
      action={
        badges.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            aria-expanded={showAll}
            className={cn("inline-flex items-center gap-1 rounded-md text-[13px] font-bold text-[#1C5AD6] hover:underline", t.focus)}
          >
            {showAll ? "Show less" : "View All"} <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </button>
        ) : undefined
      }
    >
      {progress.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-[#F1F4F9]" aria-busy="true" />
      ) : (
        <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
          {visible.map((b, i) => {
            const tone = BADGE_TONES[i % BADGE_TONES.length]!;
            return (
              <li
                key={b.definition.id}
                className="flex flex-col items-center text-center"
                title={b.earned ? b.definition.blurb : `Locked — ${b.definition.hint}`}
              >
                <span className={cn("relative h-[58px] w-[54px]", !b.earned && "opacity-45 grayscale")} aria-hidden>
                  <svg viewBox="0 0 54 58" className="absolute inset-0 h-full w-full">
                    <path
                      d="M27 2 50 15v28L27 56 4 43V15Z"
                      fill={tone.fill}
                      stroke={tone.ring}
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[24px]">
                    {b.definition.icon}
                  </span>
                  {!b.earned ? (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#6B7489] shadow">
                      <Lock className="h-3 w-3" />
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-1.5 text-[12px] font-bold leading-tight",
                    b.earned ? "text-[#13215A]" : "text-[#8A93A8]",
                  )}
                >
                  {b.definition.name}
                </span>
                <span className="sr-only">{b.earned ? "earned" : `locked: ${b.definition.hint}`}</span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------ */
/* Parent tips                                                               */
/* ------------------------------------------------------------------------ */

const TIP_IMAGES = ["/assets/journey-hero.jpeg", "/assets/checkin-21.jpeg", "/assets/checkin-20.jpeg", "/assets/checkin-22.jpeg"];

export function ParentTipsCard({ child, progress }: { child: ChildProfile | null; progress: Progress }) {
  const [index, setIndex] = useState(0);
  const tips = progress
    ? [
        ...progress.conversationStarters.map((text) => ({ title: "Talk about it at home", text })),
        ...progress.insights.slice(0, 2).map((text) => ({ title: "What we're noticing", text })),
      ]
    : [];
  const safeIndex = tips.length ? index % tips.length : 0;
  const tip = tips[safeIndex];

  return (
    <SectionCard
      id="parent-tips"
      title="Parent Tips"
      subtitle={`Simple ideas to support ${child ? `${firstNameOf(child)}'s` : "your child's"} money learning at home.`}
      icon={<Lightbulb className="h-5 w-5" strokeWidth={2.3} aria-hidden />}
      iconTone="bg-[#FFF3D4] text-[#E59A0B]"
    >
      {!tip ? (
        <Placeholder>Tips appear here once your child starts their learning journey.</Placeholder>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <TipNav dir="prev" disabled={tips.length < 2} onClick={() => setIndex((safeIndex - 1 + tips.length) % tips.length)} />
            <article
              className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-[#EEF1F6] p-3 @min-[420px]:flex-row @min-[420px]:items-center"
              aria-live="polite"
            >
              <img
                src={TIP_IMAGES[safeIndex % TIP_IMAGES.length]}
                alt=""
                className="h-24 w-full shrink-0 rounded-lg object-cover @min-[420px]:h-[84px] @min-[420px]:w-[120px]"
              />
              <div className="min-w-0">
                <h3 className={cn("text-[14px] font-extrabold", t.navy)}>{tip.title}</h3>
                <p className="mt-1 text-[13px] leading-snug text-[#3D4766]">{tip.text}</p>
              </div>
            </article>
            <TipNav dir="next" disabled={tips.length < 2} onClick={() => setIndex((safeIndex + 1) % tips.length)} />
          </div>
          {tips.length > 1 ? (
            <div className="mt-3 flex justify-center gap-1.5" role="group" aria-label="Choose a tip">
              {tips.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Tip ${i + 1} of ${tips.length}`}
                  aria-current={i === safeIndex ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === safeIndex ? "w-5 bg-[#1C5AD6]" : "w-2 bg-[#D7DEEA] hover:bg-[#B9C5DA]",
                    t.focus,
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function TipNav({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous tip" : "Next tip"}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF1FD] text-[#1C5AD6] hover:bg-[#DCE7FB] disabled:opacity-30",
        t.focus,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.6} aria-hidden />
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* Quick links                                                               */
/* ------------------------------------------------------------------------ */

export function QuickLinksCard({ child }: { child: ChildProfile | null }) {
  const tileClass = cn(
    "flex min-h-[64px] items-center gap-3 rounded-xl border border-[#EEF1F6] bg-white p-3 transition-colors hover:border-[#C9D5EC] hover:bg-[#F9FBFF]",
    t.focus,
  );
  const tile = (icon: ReactNode, tone: string, title: string, sub: string) => (
    <>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[13.5px] font-extrabold", t.navy)}>{title}</span>
        <span className={cn("block truncate text-[12px]", t.muted)}>{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#1C5AD6]" aria-hidden />
    </>
  );

  return (
    <SectionCard
      id="quick-links"
      title="Quick Links"
      icon={<Link2 className="h-5 w-5" strokeWidth={2.3} aria-hidden />}
      iconTone="bg-[#E9F1FE] text-[#1C5AD6]"
    >
      <div className="grid grid-cols-1 gap-2.5 @min-[400px]:grid-cols-2">
        <a href="#my-children" className={tileClass}>
          {tile(<Users className="h-5 w-5" aria-hidden />, "bg-[#E9F1FE] text-[#1C5AD6]", "View My Children", "Profiles and progress")}
        </a>
        {child ? (
          <Link to="/parent/child/$childId" params={{ childId: child.id }} className={tileClass}>
            {tile(<BookOpen className="h-5 w-5" aria-hidden />, "bg-[#E2F4EA] text-[#2E9E62]", "Learning Details", "Lessons and insights")}
          </Link>
        ) : null}
        <a href="#save-journey" className={tileClass}>
          {tile(<Star className="h-5 w-5" aria-hidden />, "bg-[#FFF3D4] text-[#E59A0B]", "SAVE Journey", "Days and milestones")}
        </a>
        <Link to="/parent/feedback" className={tileClass}>
          {tile(<MessageSquareHeart className="h-5 w-5" aria-hidden />, "bg-[#EFEAFD] text-[#6E4FD8]", "Share Feedback", "Tell us how it's going")}
        </Link>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------------ */
/* Brand quote                                                               */
/* ------------------------------------------------------------------------ */

export function QuoteCard({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "relative flex min-h-[170px] flex-col justify-center overflow-hidden rounded-2xl border border-[#DCE7F8] bg-gradient-to-br from-[#EAF2FE] to-[#DCE8FB] px-6 py-6",
        className,
      )}
    >
      <span className="text-[44px] font-black leading-none text-[#5B8DEF]" aria-hidden>
        “
      </span>
      <blockquote className="relative z-10 -mt-3 max-w-[22ch] text-[17px] font-semibold leading-snug text-[#1F3E86]">
        Financially smart children today, stronger families tomorrow.
      </blockquote>
      <figcaption className="relative z-10 mt-2 text-[14px] font-extrabold text-[#13215A]">– TATI ChildSave</figcaption>
      <svg className="absolute bottom-0 left-3 h-14 w-12" viewBox="0 0 48 56" aria-hidden>
        <path d="M24 56V24" stroke="#3E9E6E" strokeWidth="3" />
        <path d="M24 34C12 34 6 24 6 14c12 0 18 8 18 20Z" fill="#5DB98C" />
        <path d="M24 28c10 0 16-8 16-18-10 0-16 7-16 18Z" fill="#7FCBA3" />
      </svg>
      <svg className="absolute bottom-0 right-3 h-20 w-14" viewBox="0 0 56 80" aria-hidden>
        <path d="M28 80V30" stroke="#3E9E6E" strokeWidth="3" />
        <path d="M28 46C14 46 6 34 6 22c14 0 22 10 22 24Z" fill="#5DB98C" />
        <path d="M28 38c12 0 20-10 20-22-12 0-20 9-20 22Z" fill="#7FCBA3" />
        <path d="M28 60c-10 0-16-7-16-16 10 0 16 6 16 16Z" fill="#7FCBA3" />
      </svg>
    </figure>
  );
}
