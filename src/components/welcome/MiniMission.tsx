import { useReducer, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  INITIAL_MISSION_STATE,
  MISSION_CHOICES,
  MISSION_QUESTION,
  findMissionChoice,
  missionReducer,
} from "./mission";

const CELEBRATION = ["🪙", "⭐", "🎉", "🪙", "✨"];

/**
 * Interactive demo of a TATI money decision. It is completely local: nothing is sent to
 * Firebase and no XP, badge or progress is saved to any learner account.
 */
export function MiniMission() {
  const [state, dispatch] = useReducer(missionReducer, INITIAL_MISSION_STATE);
  const firstChoiceRef = useRef<HTMLButtonElement | null>(null);
  const answered = state.status === "answered";
  const picked = state.status === "answered" ? findMissionChoice(state.choiceId) : null;
  const success = picked?.outcome === "success";

  function replay() {
    dispatch({ type: "replay" });
    // The replay button disappears, so hand focus back to the first choice.
    requestAnimationFrame(() => firstChoiceRef.current?.focus());
  }

  return (
    <div
      id="mission-card"
      className="rounded-[26px] border border-white/20 bg-gradient-to-br from-white to-[#eff7ff] p-5 text-adventure-ink shadow-[0_25px_40px_rgb(5_14_53/0.35)] sm:p-6"
    >
      <div className="flex items-center justify-between text-xs font-black tracking-wider text-[#4570be]">
        <span>
          <span aria-hidden="true">🎯 </span>QUICK MONEY MISSION
        </span>
        <span>1 / 1</span>
      </div>

      <h3 className="my-4 text-xl font-black leading-snug sm:text-[1.45rem]">{MISSION_QUESTION}</h3>

      <ul className="space-y-2.5">
        {MISSION_CHOICES.map((choice, index) => {
          const isPicked = state.status === "answered" && state.choiceId === choice.id;
          return (
            <li key={choice.id}>
              <button
                ref={index === 0 ? firstChoiceRef : undefined}
                type="button"
                aria-pressed={isPicked}
                aria-disabled={answered}
                onClick={() => {
                  if (!answered) dispatch({ type: "choose", choiceId: choice.id });
                }}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-extrabold transition-[transform,border-color,background-color] duration-150 sm:text-base",
                  "motion-reduce:transition-none",
                  !answered &&
                    "border-[#e2e8f8] bg-[#f0f5ff] hover:-translate-y-0.5 hover:border-adventure-blue motion-reduce:hover:translate-y-0",
                  answered && "cursor-default",
                  answered && !isPicked && "border-[#e2e8f8] bg-[#f0f5ff] opacity-60",
                  isPicked && success && "border-[#26b579] bg-[#e2f9ee] text-[#0c6445]",
                  isPicked && !success && "border-[#ee7291] bg-[#fff0f2] text-[#98374d]",
                  tatiTheme.focusRing,
                )}
              >
                <span aria-hidden="true" className="text-xl">
                  {choice.emoji}
                </span>
                <span className="flex-1">{choice.label}</span>
                {isPicked && success ? (
                  <span aria-hidden="true" className="font-black text-[#26b579]">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" className="mt-4">
        {picked ? (
          <div
            className={cn(
              "rounded-2xl p-4 text-sm font-bold leading-relaxed sm:text-base",
              success ? "bg-[#e4faed] text-[#0c6445]" : "bg-[#fff0f2] text-[#98374d]",
            )}
          >
            {success ? (
              <div aria-hidden="true" className="mb-2 flex justify-center gap-2 text-2xl">
                {CELEBRATION.map((item, index) => (
                  <span
                    key={index}
                    className="tati-celebrate inline-block"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {success ? (
              <p className="text-base font-black sm:text-lg">
                <span aria-hidden="true">🏆 </span>Mission complete!
              </p>
            ) : null}
            <p>{picked.feedback}</p>
            {success ? (
              <p className="mt-2 text-xs font-extrabold text-[#17795a]">
                +50 practice XP · This is a demo, so nothing is saved to any account.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs font-extrabold text-[#5f6e90] sm:text-sm">
            <span aria-hidden="true">✦ </span>Small choices. Big possibilities. Pick an answer to
            see what happens.
          </p>
        )}
      </div>

      {answered ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={replay}
            className={cn(
              "inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#eaf0ff] px-5 text-sm font-black text-[#254bbf] transition-colors hover:bg-[#dbe6ff]",
              tatiTheme.focusRing,
            )}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            {success ? "Play again" : "Try again"}
          </button>
          {success ? (
            <Link
              to="/child/login"
              className={cn(
                "inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-adventure-blue px-5 text-sm font-black text-white transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                tatiTheme.focusRing,
              )}
            >
              Continue to Learner sign in
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
