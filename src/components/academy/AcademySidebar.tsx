import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { tatiTheme } from "@/lib/theme";

export interface SidebarItem {
  label: string;
  to: string;
  icon?: string;
}

const PRIMARY_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/academy/dashboard", icon: "📊" },
  { label: "My Cohorts", to: "/academy/cohorts", icon: "🏫" },
];

const SECONDARY_ITEMS: SidebarItem[] = [{ label: "Profile", to: "/academy/profile", icon: "👤" }];

export function AcademySidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="flex flex-col gap-3">
      <nav aria-label="Primary navigation" className="space-y-1">
        {PRIMARY_ITEMS.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.to || pathname.startsWith(item.to + "/")}
          />
        ))}
      </nav>

      <hr className="my-2 border-border" />

      <nav aria-label="Secondary navigation" className="space-y-1">
        {SECONDARY_ITEMS.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.to}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarLink({
  to,
  label,
  icon,
  isActive,
}: {
  to: string;
  label: string;
  icon?: string | undefined;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
        tatiTheme.focusRing,
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      activeProps={{}}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}
