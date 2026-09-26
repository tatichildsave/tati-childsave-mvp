import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { tatiTheme } from "@/lib/theme";
import { Logo } from "@/components/tati";
import { logoutFacilitator, getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import logo from "@/assets/tati-logo.svg";

export function AcademyHeader() {
  const navigate = useNavigate();
  const { data: session } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  async function handleLogout() {
    await logoutFacilitator();
    navigate({ to: "/academy/login", replace: true });
  }

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="TATI ChildSave home" className="inline-flex shrink-0">
            <img src={logo} alt="TATI" width={44} height={44} className="h-11 w-11" />
          </Link>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              TATI Academy
            </p>
            <p className="text-sm font-bold text-foreground">
              {session?.displayName ?? "Facilitator"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "min-h-[48px] px-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground",
              tatiTheme.focusRing,
            )}
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
