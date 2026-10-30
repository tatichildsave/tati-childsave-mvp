import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { AdventureVisual } from "./AdventureVisual";
import { WELCOME_ROLES, getWelcomeRole } from "./roles";

const quickAccess = WELCOME_ROLES.filter((role) => role.id !== "learner");

export function WelcomeHero() {
  const learner = getWelcomeRole("learner");

  return (
    <section aria-labelledby="welcome-heading" className="tati-adventure-hero pb-14 lg:pb-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[3%] top-6 -z-10 hidden h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgb(104_153_255/0.48)_0%,rgb(58_102_204/0.14)_40%,transparent_72%)] blur-[15px] lg:block"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-3 text-[28px] text-[#ff7bb9] opacity-85 lg:right-[23%] lg:top-11 lg:text-[40px]"
      >
        ✳
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[47%] top-[88px] hidden rotate-[20deg] text-[45px] text-adventure-sun opacity-85 lg:block"
      >
        ✳
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-24 left-[44%] hidden text-3xl text-adventure-mint opacity-85 lg:block"
      >
        ✦
      </span>

      <div className="mx-auto grid w-full max-w-[1300px] items-center gap-4 px-5 pt-6 sm:px-8 lg:grid-cols-[48fr_52fr] lg:gap-0 lg:px-12 lg:pt-8">
        <div className="relative z-[2] min-w-0 py-3 lg:py-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#e8efff] backdrop-blur-sm sm:px-4 sm:text-xs">
            <span aria-hidden="true" className="text-base text-adventure-sun">
              ✦
            </span>
            Welcome to the TATI adventure
          </p>

          <h1
            id="welcome-heading"
            className="mt-5 max-w-[660px] text-[clamp(2.7rem,12vw,3.6rem)] font-black leading-[1.02] tracking-[-0.055em] text-white lg:mt-6 lg:text-[clamp(3rem,4.55vw,4.1rem)]"
          >
            Money skills
            <br />
            are your new
            <br />
            <span className="relative inline-block whitespace-nowrap text-adventure-sun after:absolute after:inset-x-1 after:-bottom-2 after:h-2 after:-rotate-2 after:rounded-full after:bg-adventure-pink after:content-['']">
              SUPERPOWER!
            </span>
          </h1>

          <p className="mt-6 max-w-[495px] text-[0.95rem] font-medium leading-relaxed text-[#d8e8ff] sm:text-base lg:mt-7">
            Save for your dreams. Take on fun money missions. Earn badges. Discover how smart
            choices unlock big possibilities!
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-7">
            <Link
              to={learner.to}
              className={cn(
                "inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-adventure-sun px-5 text-sm font-black text-[#122051] sm:px-6 sm:text-[0.95rem]",
                "shadow-[0_8px_0_var(--adventure-sun-deep),0_14px_22px_rgb(11_27_99/0.3)] transition-transform duration-200 hover:-translate-y-1",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                tatiTheme.focusRing,
              )}
            >
              <span aria-hidden="true">🚀</span>
              Start my adventure
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a
              href="#mini-mission"
              className={cn(
                "inline-flex min-h-[52px] items-center gap-2 rounded-2xl border-[1.5px] border-[#a5c0fa] px-5 text-sm font-extrabold text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/10 sm:text-[0.95rem]",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                tatiTheme.focusRing,
              )}
            >
              <Play aria-hidden="true" className="h-4 w-4 fill-current" />
              Try a free mini-mission
            </a>
          </div>

          <nav
            aria-label="Other sign-ins"
            className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold text-[#dae5ff] lg:mt-6"
          >
            <span className="mr-1 w-full sm:w-auto">Already have an account?</span>
            {quickAccess.map((role) => (
              <Link
                key={role.id}
                to={role.to}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3.5 text-xs font-extrabold text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/20",
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  tatiTheme.focusRing,
                )}
              >
                {role.chip}
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            ))}
          </nav>

          <p className="mt-5 hidden items-center gap-3 text-[13px] font-semibold text-[#cbdafd] sm:flex">
            <span aria-hidden="true" className="flex">
              {["🧑🏾", "👧🏿", "👦🏽"].map((face, index) => (
                <span
                  key={face}
                  className={cn(
                    "-ml-1 grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-[#1748b7] text-[17px] first:ml-0",
                    index === 0 && "bg-[#f4d29d]",
                    index === 1 && "bg-[#ffcfe4]",
                    index === 2 && "bg-[#f3eaa1]",
                  )}
                >
                  {face}
                </span>
              ))}
            </span>
            Made for curious kids aged 8–12
          </p>
        </div>

        <AdventureVisual />
      </div>
    </section>
  );
}
