import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { MiniMission } from "./MiniMission";
import { RoleGateway } from "./RoleGateway";
import { WelcomeHeader } from "./WelcomeHeader";
import { WelcomeHero } from "./WelcomeHero";

const highlights = [
  {
    emoji: "🎮",
    title: "Play money missions",
    description: "Smart choices, fun challenges",
    tint: "bg-[#fff0c1]",
  },
  {
    emoji: "🎯",
    title: "Save for real goals",
    description: "Big dreams start with little steps",
    tint: "bg-adventure-tint-green",
  },
  {
    emoji: "🏆",
    title: "Earn your achievements",
    description: "Every lesson unlocks progress",
    tint: "bg-adventure-tint-violet",
  },
] as const;

/** The TATI ChildSave welcome page: adventure hero, four real sign-in entrances and a demo mission. */
export function WelcomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-adventure-mist font-sans text-adventure-ink">
      <WelcomeHeader />
      <main>
        <WelcomeHero />
        <RoleGateway />

        <section
          id="how"
          aria-label="What you can do with TATI"
          className="scroll-mt-4 px-4 py-6 sm:px-8 lg:px-12 lg:py-9"
        >
          <ul className="mx-auto grid w-full max-w-[1300px] gap-3 lg:grid-cols-3 lg:gap-[18px]">
            {highlights.map((item) => (
              <li
                key={item.title}
                className="flex items-center gap-3 rounded-[19px] border border-[#e9edfb] bg-white px-4 py-3.5 shadow-[0_5px_13px_rgb(27_68_161/0.06)] lg:px-5 lg:py-[18px]"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-[50px] w-[50px] shrink-0 place-items-center rounded-2xl text-2xl",
                    item.tint,
                  )}
                >
                  {item.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-black">{item.title}</span>
                  <span className="block text-sm font-semibold text-adventure-muted">
                    {item.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="mini-mission"
          aria-labelledby="mission-heading"
          className="scroll-mt-4 bg-adventure-night px-5 py-14 text-white sm:px-8 lg:px-12 lg:py-[78px]"
        >
          <div className="mx-auto grid w-full max-w-[1300px] items-center gap-6 lg:grid-cols-2 lg:gap-[60px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-adventure-mint">
                Try before you sign in
              </p>
              <h2
                id="mission-heading"
                className="mb-5 mt-3 text-[clamp(2rem,8vw,2.75rem)] font-black leading-[1.12] tracking-tight"
              >
                What would YOU do with GH₵20? <span aria-hidden="true">🤔</span>
              </h2>
              <p className="max-w-xl text-base leading-relaxed text-[#c6d5ff] sm:text-[1.05rem]">
                Kids don't just watch lessons at TATI. They make choices, discover consequences, and
                celebrate smart money moves. Here's a small taste.
              </p>
              <a
                href="#mission-card"
                className={cn(
                  "mt-7 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-adventure-sun px-6 text-[0.95rem] font-black text-[#122051]",
                  "shadow-[0_8px_0_var(--adventure-sun-deep),0_14px_22px_rgb(11_27_99/0.3)] transition-transform duration-200 hover:-translate-y-1",
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  tatiTheme.focusRing,
                )}
              >
                Play the 30-second mission
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
            <MiniMission />
          </div>
        </section>
      </main>

      <footer className="bg-adventure-footer px-5 py-6 text-[13px] text-[#a9b8e3] sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <strong className="text-white">
            TATI ChildSave — Money skills for life's adventures.
          </strong>
          <span>Designed for Ghanaian kids, families and educators</span>
        </div>
      </footer>
    </div>
  );
}
