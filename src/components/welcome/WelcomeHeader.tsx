import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import logo from "@/assets/tati-logo.png";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ListenWelcomeButton } from "./ListenWelcomeButton";

const navLinks = [
  { href: "#how", label: "The adventure" },
  { href: "#choose", label: "All sign-ins" },
  { href: "#mini-mission", label: "Try a mission" },
] as const;

export function WelcomeHeader() {
  return (
    <header className="relative z-20 bg-white shadow-[0_6px_30px_rgb(18_27_77/0.04)]">
      <div className="mx-auto flex h-[76px] w-full max-w-[1300px] items-center justify-between gap-3 px-5 sm:px-8 lg:h-[95px] lg:px-12">
        <Link
          to="/"
          aria-label="TATI ChildSave home"
          className={cn("flex min-w-0 items-center gap-2 rounded-xl sm:gap-3", tatiTheme.focusRing)}
        >
          <img
            src={logo}
            alt=""
            width={56}
            height={56}
            className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11 lg:h-14 lg:w-14"
          />
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[1.05rem] font-black leading-none tracking-tight text-[#1946bd] sm:text-lg lg:text-2xl">
              TATI <span className="text-adventure-green">ChildSave</span>
            </span>
            <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#5b6385] max-[400px]:hidden lg:text-[10px]">
              Financial capability for kids
            </span>
          </span>
        </Link>

        <nav aria-label="Welcome page sections" className="hidden items-center gap-8 lg:flex">
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md text-sm font-bold text-[#49516b] transition-colors hover:text-adventure-blue",
                tatiTheme.focusRing,
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ListenWelcomeButton />
          <a
            href="#choose"
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-adventure-blue px-3.5 text-sm font-extrabold text-white shadow-[0_6px_10px_rgb(17_65_204/0.16)] transition-transform hover:-translate-y-0.5 sm:px-6",
              "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              tatiTheme.focusRing,
            )}
          >
            Sign in
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
