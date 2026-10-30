import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Gamepad2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { Avatar, Button, Card, GoalWidget, Page, ProgressBar } from "@/components/tati";
import logo from "@/assets/tati-logo.png";
import kidsHero from "@/assets/tati-kids-hero.webp";
import { childItemPath, itemTitle } from "@/lib/learning/track";
import type { ProgressSnapshot } from "@/lib/progress/snapshot";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ChildProfile = {
  name: string;
  avatar: string;
};

export function ChildDashboard({
  child,
  snapshot,
  onSignOut,
  signingOut,
  signOutError,
}: {
  child: ChildProfile;
  snapshot: ProgressSnapshot;
  onSignOut: () => void;
  signingOut: boolean;
  signOutError: boolean;
}) {
  const { currentItem, steps, track, game } = snapshot;
  const currentIndex = steps.findIndex((step) => step.current);
  const previewStart =
    currentIndex < 0 ? Math.max(0, steps.length - 3) : Math.max(0, currentIndex - 1);
  const preview = steps.slice(previewStart, previewStart + 3);
  const progressPercent = game.journey.total > 0 ? game.journey.pct : 0;

  return (
    <Page withBottomNav role="junior" className="relative overflow-hidden pb-32">
      <header className="relative z-10 flex items-center justify-between gap-4 py-2">
        <img
          src={logo}
          alt="TATI ChildSave"
          className="h-12 w-12 rounded-full bg-white p-0.5 shadow-card"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3fb] text-muted-foreground shadow-card",
              tatiTheme.focusRing,
            )}
          >
            <Bell aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className={cn(
              "min-h-11 rounded-xl px-3 text-sm font-extrabold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60",
              tatiTheme.focusRing,
            )}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      {signOutError ? (
        <p role="alert" className="relative z-10 mt-2 text-sm font-bold text-destructive">
          We couldn't sign you out. Please try again.
        </p>
      ) : null}

      <main className="relative z-10 space-y-6 pb-2 pt-4 sm:space-y-7 sm:pt-6">
        <section aria-labelledby="welcome-title">
          <div className="relative overflow-hidden rounded-[30px] border border-primary/10 bg-gradient-to-br from-white via-white to-[#f2f7ff] p-5 shadow-card sm:p-6">
            <img
              src={kidsHero}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-5 bottom-0 h-24 w-44 object-cover opacity-18 sm:h-28 sm:w-48"
            />
            <div className="flex items-start gap-4 sm:gap-6">
              <img
                src={logo}
                alt=""
                aria-hidden="true"
                className="mt-0.5 hidden h-11 w-11 shrink-0 rounded-full bg-white p-0.5 shadow-card sm:block"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold uppercase tracking-wider text-primary">
                  Welcome back
                </p>
                <h1
                  id="welcome-title"
                  className="mt-1 break-words pr-1 text-[1.82rem] font-extrabold leading-[1.08] text-[#0f2248] sm:text-[2.2rem]"
                >
                  Akwaaba, {child.name}!
                </h1>
                <p className="mt-1.5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Ready for your next money adventure?
                </p>
              </div>
              <Avatar avatar={child.avatar} name={child.name} size={60} ring="primary" />
            </div>

            <div className="relative mt-4 rounded-2xl border border-[#d5e3ff] bg-[#eef4ff] p-3.5 sm:mt-5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-[#0f2248]">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
                    ★
                  </span>
                  Level {game.level} · {game.levelLabel}
                </p>
                <p className="text-sm font-bold text-muted-foreground">{progressPercent}%</p>
              </div>
              <ProgressBar
                value={game.journey.done}
                max={game.journey.total}
                label={`${game.journey.done} of ${game.journey.total} adventures`}
                showPercent={false}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="continue-title">
          <h2 id="continue-title" className="mb-3 text-[1.4rem] font-extrabold text-[#0f2248]">
            Continue learning
          </h2>
          <Card className="overflow-hidden rounded-[30px] border border-[#c9d9fa] bg-white p-5 shadow-card sm:p-6">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e9f1ff] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
              <Compass aria-hidden="true" className="h-3.5 w-3.5" />
              Today's quest
            </div>
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf3ff] text-primary shadow-sm">
                <Compass aria-hidden="true" className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                {currentItem ? (
                  <>
                    <p className="text-sm font-extrabold uppercase tracking-wide text-primary">
                      {currentItem.label}
                    </p>
                    <h3 className="mt-1 break-words text-[1.92rem] font-extrabold leading-[1.08] text-[#0f2248] sm:text-[2.05rem]">
                      {itemTitle(track, currentItem)}
                    </h3>
                    {currentItem.blurb ? (
                      <p className="mt-2 text-base leading-relaxed text-[#31486b]">
                        {currentItem.blurb}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-extrabold leading-tight text-[#0f2248]">
                      {game.journeyComplete ? "Adventure complete!" : "Your adventure awaits"}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {game.journeyComplete
                        ? "Look back at what you learned along the way."
                        : "Explore your learning journey to see what's next."}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3ff] text-primary shadow-sm">
                <Gamepad2 aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#edf3ff] px-2 text-xs font-extrabold text-primary shadow-sm">
                {progressPercent}%
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-[#eff4ff]">
              <img
                src={kidsHero}
                alt=""
                aria-hidden="true"
                className="h-24 w-full object-cover object-center opacity-95"
              />
            </div>
            <Button
              to={
                currentItem
                  ? childItemPath(currentItem)
                  : game.journeyComplete
                    ? "/child/results"
                    : "/child/learn"
              }
              size="lg"
              className="mt-4 min-h-[56px] w-full rounded-full bg-[#003DA5] text-white shadow-[0_8px_20px_rgba(0,61,165,0.25)] hover:bg-[#002f80]"
            >
              {currentItem
                ? "Continue Adventure"
                : game.journeyComplete
                  ? "View my results"
                  : "View my journey"}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Button>
          </Card>
        </section>

        <section aria-labelledby="adventures-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="adventures-title" className="text-xl font-extrabold">
              Your adventures
            </h2>
            <Link
              to="/child/learn"
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-extrabold text-primary",
                tatiTheme.focusRing,
              )}
            >
              View journey <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          {preview.length ? (
            <ol className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {preview.map((step) => (
                <li
                  key={`${step.item.kind}:${step.item.id}`}
                  className="min-w-0 rounded-2xl border border-[#dfe7f8] bg-white p-3 text-center shadow-card"
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-muted-foreground">
                      {String(step.index + 1).padStart(2, "0")}
                    </span>
                    {step.done ? (
                      <Check aria-hidden="true" className="h-4 w-4 text-success" />
                    ) : step.locked ? (
                      <LockKeyhole aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <BookOpen aria-hidden="true" className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="min-h-8 break-words text-xs font-extrabold leading-tight text-[#102346]">
                      {step.item.label}
                    </h3>
                    <p
                      className={cn(
                        "mt-1 text-[11px] font-extrabold",
                        step.done
                          ? "text-success"
                          : step.locked
                            ? "text-muted-foreground"
                            : "text-primary",
                      )}
                    >
                      {step.done
                        ? "Completed"
                        : step.locked
                          ? "Locked"
                          : step.current
                            ? "Ready to continue"
                            : "Ready"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Card tone="muted">
              <p className="text-muted-foreground">There are no adventures to show yet.</p>
            </Card>
          )}
        </section>

        <details className="group rounded-3xl border border-[#e5ebf7] bg-card px-5 shadow-card">
          <summary
            className={cn(
              "flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl font-extrabold",
              tatiTheme.focusRing,
            )}
          >
            My goal and badges
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="space-y-4 pb-5">
            {track.goal ? (
              <GoalWidget
                goalLabel={track.goal.title}
                targetAmount={track.goal.target}
                currentSaved={snapshot.journey.savedCedis}
                daysTotal={track.goal.daysTotal}
                dayNumber={snapshot.journey.dayNumber}
              />
            ) : null}
            <div>
              <h3 className="inline-flex items-center gap-2 font-extrabold">
                <Sparkles className="h-4 w-4 text-warning" aria-hidden="true" />
                Badges earned: {game.earnedBadges.length}
              </h3>
              {game.earnedBadges.length ? (
                <ul className="mt-2 space-y-2">
                  {game.earnedBadges.map((badge) => (
                    <li key={badge.definition.id} className="rounded-2xl bg-secondary p-3">
                      <p className="font-extrabold">{badge.definition.name}</p>
                      <p className="text-sm text-muted-foreground">{badge.definition.blurb}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete challenges to earn badges.
                </p>
              )}
            </div>
          </div>
        </details>
      </main>
    </Page>
  );
}
