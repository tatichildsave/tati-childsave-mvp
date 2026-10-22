/**
 * Admin Dashboard — New Design Implementation
 * 
 * Reproduces the approved visual design with:
 * - Shared admin workspace chrome (sidebar and navigation) via AdminWorkspace
 * - Hero welcome section with profile and image
 * - KPI cards with real Firestore data and trend indicators
 * - Enrol New Family CTA banner
 * - Recent Activity section
 * - Quick Links navigation cards
 * - Fully responsive layout (desktop, tablet, mobile)
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { getFirebaseFirestore } from "@/integrations/firebase/client";
import { Button } from "@/components/tati";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { familyDisplayName } from "@/components/admin/family-format";
import { listFamiliesAdmin, type AdminFamilySummary } from "@/lib/backend/provisioning.functions";
import {
  Users,
  BookOpen,
  UserCheck,
  Layers,
  Calendar,
  ChevronRight,
  Plus,
  Clock,
  LinkIcon,
} from "lucide-react";

export const Route = createFileRoute("/admin/dashboard-v2")({
  component: AdminDashboardV2,
});

interface DashboardStats {
  totalFamilies: number;
  activeLearners: number;
  totalFacilitators: number;
  activeCohorts: number;
}

interface ActivityItem {
  id: string;
  type: "family" | "child" | "learner";
  title: string;
  description: string;
  timestamp: Date;
  badge?: string;
  badgeColor?: "primary" | "success" | "warning";
}

function AdminDashboardV2() {
  const navigate = useNavigate();
  const db = getFirebaseFirestore();

  const [stats, setStats] = useState<DashboardStats>({
    totalFamilies: 0,
    activeLearners: 0,
    totalFacilitators: 0,
    activeCohorts: 0,
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      if (!db) {
        setError(null);
        setLoading(false);
        return; // Database not available, show empty state
      }

      let families: AdminFamilySummary[] = [];
      let users: Array<Record<string, unknown>> = [];

      // Families and learner counts come from the admin-only server function
      try {
        families = await listFamiliesAdmin();
      } catch (err: any) {
        console.warn("Could not load families:", err.message);
      }

      // Fetch users with error handling
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (err: any) {
        console.warn("Could not load users:", err.message);
        // Continue with empty array
      }

      // Calculate stats (retired/superseded families are excluded)
      const activeFamilies = families.filter((f) => f.status === "active");
      const facilitators = users.filter((u) => (u["roles"] as string[] | undefined)?.includes("facilitator"));
      const activeLearners = activeFamilies.reduce((sum, f) => sum + f.childrenCount, 0);

      setStats({
        totalFamilies: activeFamilies.length,
        activeLearners,
        totalFacilitators: facilitators.length,
        activeCohorts: 0, // Placeholder: awaits sessions collection
      });

      // Recent activity: most recently enrolled families (already sorted newest first)
      const activities: ActivityItem[] = activeFamilies
        .filter((f) => f.createdAt)
        .slice(0, 5)
        .map((family) => ({
          id: `family-${family.id}`,
          type: "family",
          title: `Family enrolled: ${familyDisplayName(family)}`,
          description: `${family.childrenCount} ${family.childrenCount === 1 ? "child" : "children"}`,
          timestamp: new Date(family.createdAt!),
          badge: "Primary",
          badgeColor: "primary",
        }));

      setRecentActivity(activities);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      // Don't show error - let page render with available data
      setLoading(false);
    }
  }

  const handleEnrolFamily = () => {
    navigate({ to: "/admin/enroll" });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <AdminWorkspace title="Admin Dashboard" active="dashboard">
      {/* Hero Section */}
      <HeroSection loading={loading} />

      {/* KPI Cards */}
      <KPIGrid stats={stats} loading={loading} />

      {/* Enrol CTA */}
      <EnrolBanner onGetStarted={handleEnrolFamily} />

      {/* Activity and Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 md:mt-8">
        {/* Recent Activity */}
        <ActivitySection
          activities={recentActivity}
          loading={loading}
          formatTime={formatTime}
        />

        {/* Quick Links */}
        <QuickLinksSection onNavigate={(route) => navigate({ to: route })} />
      </div>
    </AdminWorkspace>
  );
}

function HeroSection({ loading }: { loading: boolean }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl md:rounded-2xl p-4 sm:p-6 mb-6 md:mb-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary mb-1 md:mb-2">GOOD TO SEE YOU AGAIN</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">
          Welcome back, <span className="text-primary">Administrator</span>
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          Here's an overview of your platform and the impact you're making with TATI ChildSave.
        </p>
      </div>

      {/* Hero Image - Hidden on tablet, visible only on large desktop */}
      <div className="hidden 2xl:flex w-48 h-40 flex-shrink-0">
        <img
          src="/images/admin-hero.png"
          alt="Two smiling African schoolchildren"
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    </div>
  );
}

interface KPIGridProps {
  stats: DashboardStats;
  loading: boolean;
}

function KPIGrid({ stats, loading }: KPIGridProps) {
  const kpis = [
    {
      label: "TOTAL FAMILIES",
      value: stats.totalFamilies,
      icon: Users,
      note: "Enrolled families",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "ACTIVE LEARNERS",
      value: stats.activeLearners,
      icon: BookOpen,
      note: "Children provisioned",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "FACILITATORS",
      value: stats.totalFacilitators,
      icon: Users,
      note: "Facilitator accounts",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "ACTIVE COHORTS",
      value: stats.activeCohorts,
      icon: Calendar,
      note: "No active cohorts yet",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="bg-white rounded-lg md:rounded-xl border border-gray-200 p-4 md:p-5 hover:shadow-lg transition-shadow"
          >
            <div className={`${kpi.bgColor} w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mb-3 md:mb-4`}>
              <Icon className={`w-5 h-5 md:w-6 md:h-6 ${kpi.color}`} />
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-1">{kpi.label}</p>
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{kpi.value}</p>
                <p className="text-xs md:text-sm text-gray-500">{kpi.note}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface EnrolBannerProps {
  onGetStarted: () => void;
}

function EnrolBanner({ onGetStarted }: EnrolBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-6 md:p-8 mb-6 md:mb-8 text-white">
      {/* Mobile Layout */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-400 rounded-full p-2 flex-shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-100">ENROL NEW FAMILY</p>
            <h3 className="text-lg font-bold">Add a new family</h3>
          </div>
        </div>
        <p className="text-sm text-blue-100">
          Register a family and provision their children with TATI IDs to get started.
        </p>
        <Button
          onClick={onGetStarted}
          className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold px-4 py-3 rounded-lg"
        >
          Get Started <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Tablet/Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-6 md:items-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-blue-400 rounded-full p-4 w-fit">
            <Plus className="w-8 h-8" />
          </div>
        </div>

        {/* Text Content */}
        <div className="md:col-span-1">
          <p className="text-xs font-semibold text-blue-100 mb-1">ENROL NEW FAMILY</p>
          <h3 className="text-2xl lg:text-3xl font-bold mb-2">
            Add a new family
          </h3>
          <p className="text-sm text-blue-100">
            Register a family and provision their children with TATI IDs to get started.
          </p>
        </div>

        {/* Button */}
        <div className="flex justify-end">
          <Button
            onClick={onGetStarted}
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-lg whitespace-nowrap"
          >
            Get Started <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ActivitySectionProps {
  activities: ActivityItem[];
  loading: boolean;
  formatTime: (date: Date) => string;
}

function ActivitySection({ activities, loading, formatTime }: ActivitySectionProps) {
  return (
    <div className="lg:col-span-2 bg-white rounded-lg md:rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-bold text-gray-900">Recent Activity</h3>
          <p className="text-xs md:text-sm text-gray-500">Latest updates and activity across the platform.</p>
        </div>
        <a href="#" className="text-primary text-xs md:text-sm font-semibold flex items-center gap-1 whitespace-nowrap">
          View all <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
        </a>
      </div>

      {loading ? (
        <div className="space-y-3 md:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-center text-gray-500 py-6 md:py-8 text-sm">No recent activity</p>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="pb-3 md:pb-4 last:pb-0 last:border-b-0 border-b border-gray-100">
              <div className="flex gap-3 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {activity.type === "family" && (
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    )}
                    {activity.type === "child" && (
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    )}
                    {activity.type === "learner" && (
                      <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900 break-words">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 md:mt-1 break-words">
                        {activity.description}
                      </p>
                    </div>
                    {activity.badge && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                          activity.badgeColor === "primary"
                            ? "bg-blue-100 text-blue-700"
                            : activity.badgeColor === "success"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {activity.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface QuickLinksSectionProps {
  onNavigate: (route: string) => void;
}

function QuickLinksSection({ onNavigate }: QuickLinksSectionProps) {
  const quickLinks = [
    {
      label: "View Families",
      description: "Browse and manage all families",
      icon: Users,
      href: "/admin/families",
    },
    {
      label: "View Learners",
      description: "View and manage learner profiles",
      icon: BookOpen,
      href: "#",
    },
    {
      label: "View Facilitators",
      description: "Manage facilitators and their details",
      icon: UserCheck,
      href: "#",
    },
    {
      label: "Manage Programmes",
      description: "View programmes and curriculum",
      icon: Layers,
      href: "#",
    },
  ];

  return (
    <div className="bg-white rounded-lg md:rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900">Quick Links</h3>
        <p className="text-xs md:text-sm text-gray-500">
          Common tasks to help you get started quickly.
        </p>
      </div>

      <div className="space-y-2 md:space-y-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.label}
              onClick={() => onNavigate(link.href)}
              disabled={link.href === "#"}
              className={`w-full text-left p-3 md:p-4 rounded-lg border transition-colors ${
                link.href === "#"
                  ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                  : "border-gray-200 hover:border-primary hover:bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">
                      {link.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{link.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
