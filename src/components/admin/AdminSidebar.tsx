/**
 * AdminSidebar
 *
 * Elegant navigation sidebar for TATI admin workspace.
 * - Shows all available admin sections
 * - Active state highlighting
 * - Icons from Lucide React
 * - Responsive hiding on mobile (uses drawer instead)
 */

import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { tatiTheme } from '@/lib/theme';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserCheck,
  Layers,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Activity,
} from 'lucide-react';
import logo from '@/assets/tati-logo.svg';
import { Button } from '@/components/tati';
import { useNavigate } from '@tanstack/react-router';
import { getFirebaseAuth } from '@/integrations/firebase/client';
import { signOut } from 'firebase/auth';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function AdminSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      to: '/admin/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'Families',
      to: '/admin/families',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Learners',
      to: '/admin/learners',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: 'Facilitators',
      to: '/admin/facilitators',
      icon: <UserCheck className="h-5 w-5" />,
    },
    {
      label: 'Activity',
      to: '/admin/activity',
      icon: <Activity className="h-5 w-5" />,
    },
    {
      label: 'Programmes',
      to: '/admin/programmes',
      icon: <Layers className="h-5 w-5" />,
      disabled: true,
      comingSoon: true,
    },
    {
      label: 'Sessions',
      to: '/admin/sessions',
      icon: <Calendar className="h-5 w-5" />,
      disabled: true,
      comingSoon: true,
    },
    {
      label: 'Reports',
      to: '/admin/analytics',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: 'Settings',
      to: '/admin/settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const isActive = (to: string) => {
    return pathname === to || pathname.startsWith(to + '/');
  };

  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await signOut(auth);
        navigate({ to: '/admin-login', replace: true });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="flex flex-col h-full overflow-y-auto">
      {/* Logo & Branding */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <Link to="/admin/dashboard" className="shrink-0">
          <img src={logo} alt="TATI" width={40} height={40} className="h-10 w-10" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to="/admin/dashboard"
            className="block text-sm font-extrabold text-foreground hover:text-primary transition-colors truncate"
          >
            TATI Admin
          </Link>
          <p className="text-xs text-muted-foreground">Management</p>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.to);

          if (item.disabled) {
            return (
              <div
                key={item.to}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold',
                  'opacity-50 cursor-not-allowed text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-muted-foreground shrink-0">{item.icon}</div>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.comingSoon && (
                  <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-warning-soft text-accent-foreground whitespace-nowrap">
                    Soon
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all',
                tatiTheme.focusRing,
                active
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-foreground hover:bg-secondary hover:shadow-sm'
              )}
              activeProps={{}}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">{item.icon}</div>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="shrink-0 text-xs font-extrabold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Logout Button */}
      <div className="px-3 py-4">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold',
            'text-destructive hover:bg-destructive/10 transition-colors',
            tatiTheme.focusRing
          )}
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
