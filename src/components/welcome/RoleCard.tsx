import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { WelcomeRole } from "./roles";

/** One sign-in entrance. Always a real router link to an existing sign-in route. */
export function RoleCard({ role }: { role: WelcomeRole }) {
  return (
    <Link
      to={role.to}
      aria-label={`${role.title}. ${role.description}`}
      className={cn(
        "group flex min-h-[116px] w-full flex-col justify-center gap-1 rounded-2xl p-3.5 text-adventure-ink",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_32px_rgb(35_58_110/0.16)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "sm:min-h-[108px] sm:flex-row sm:items-center sm:justify-start sm:gap-4 sm:rounded-[20px] sm:p-4",
        role.tint,
        tatiTheme.focusRing,
      )}
    >
      <span
        aria-hidden="true"
        className="text-[1.65rem] leading-none transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:w-12 sm:shrink-0 sm:text-center sm:text-[2.1rem]"
      >
        {role.emoji}
      </span>
      <span className="block min-w-0">
        <span className="block text-[0.95rem] font-extrabold leading-tight sm:text-base lg:text-[1.05rem]">
          {role.title}
        </span>
        <span className="mt-1 block text-xs font-bold leading-snug text-adventure-muted sm:text-sm">
          {role.description}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-extrabold text-adventure-blue sm:text-sm">
          {role.cta}
          <ArrowUpRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
          />
        </span>
      </span>
    </Link>
  );
}
