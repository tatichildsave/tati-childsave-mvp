/**
 * Admin Dashboard Overview
 *
 * Premium dashboard with KPI metrics, quick actions, and recent activity.
 * This is the main entry point for admin workspace.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseFirestore } from "@/integrations/firebase/client";
import { UserPlus, Users, BookOpen, Zap } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { MetricCard } from "@/components/admin/MetricCard";
import { ActionCard } from "@/components/admin/ActionCard";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import type { ActivityItem } from "@/components/admin/ActivityFeed";
import { LoadingState, EmptyState } from "@/components/admin/States";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardOverview,
});

interface DashboardStats {
  totalFamilies: number;
  activeLearners: number;
  totalFacilitators: number;
  activeCohorts: number;
}

function AdminDashboardOverview() {
  const navigate = useNavigate();
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

      const db = getFirebaseFirestore();
      if (!db) {
        setError("Database not available");
        setLoading(false);
        return;
      }

      // Load all necessary collections
      const [familiesSnap, usersSnap, childrenSnap] = await Promise.all([
        getDocs(collection(db, "families")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "children")),
      ]);

      // Parse data
      const families = familiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const children = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Calculate stats
      const facilitators = users.filter((u) =>
        (u.roles as string[])?.includes("facilitator"),
      );
      const activeLearners = children.filter((c) => !c.archived).length;

      // TODO: activeCohorts would come from a cohorts/sessions collection when implemented
      const activeCohorts = 0;

      setStats({
        totalFamilies: families.length,
        activeLearners,
        totalFacilitators: facilitators.length,
        activeCohorts,
      });

      // Build recent activity from family/child creation timestamps
      const activities: ActivityItem[] = [];

      // Add family creation events
      families
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        })
        .slice(0, 3)
        .forEach((family) => {
          const timestamp = family.createdAt?.toDate?.() || new Date();
          activities.push({
            id: `family-${family.id}`,
            icon: "👨‍👩‍👧‍👦",
            title: `Family created: ${family.name || "Unnamed"}`,
            description: `${(children.filter((c) => c.familyId === family.id) || []).length} member(s)`,
            timestamp,
            tone: "primary",
          });
        });

      // Add child creation events
      children
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        })
        .slice(0, 2)
        .forEach((child) => {
          const timestamp = child.createdAt?.toDate?.() || new Date();
          activities.push({
            id: `child-${child.id}`,
            icon: "👶",
            title: `Child enrolled: ${child.name || "Unnamed"}`,
            description: `TATI ID: ${child.tatiId || "Pending"}`,
            timestamp,
            tone: "success",
          });
        });

      // Sort by timestamp (newest first) and keep top 5
      activities.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
      setRecentActivity(activities.slice(0, 5));

      setLoading(false);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  }

  const handleEnrolFamily = () => {
    navigate({ to: "/admin/enroll" });
  };

  const handleViewFamilies = () => {
    navigate({ to: "/admin/families" });
  };

  if (error) {
    return (
      <AdminLayout title="Dashboard" description="Admin overview">
        <div className="p-6">
          <EmptyState
            icon="⚠️"
            title="Something went wrong"
            message={error}
            action={{
              label: "Try again",
              onClick: () => loadDashboardData(),
            }}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard" description="Welcome to TATI Admin">
      <div className="space-y-8">
        {/* Greeting Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, Administrator
          </h1>
          <p className="text-base text-muted-foreground">
            Here's an overview of your platform
          </p>
        </div>

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Families"
            value={stats.totalFamilies}
            icon={<Users className="w-5 h-5" />}
            tone="primary"
            loading={loading}
          />
          <MetricCard
            label="Active Learners"
            value={stats.activeLearners}
            icon={<BookOpen className="w-5 h-5" />}
            tone="success"
            loading={loading}
          />
          <MetricCard
            label="Facilitators"
            value={stats.totalFacilitators}
            icon={<UserPlus className="w-5 h-5" />}
            tone="accent"
            loading={loading}
          />
          <MetricCard
            label="Active Cohorts"
            value={stats.activeCohorts}
            icon={<Zap className="w-5 h-5" />}
            tone="neutral"
            loading={loading}
          />
        </div>

        {/* Quick Action */}
        <ActionCard
          icon={<UserPlus className="w-6 h-6" />}
          title="Enrol New Family"
          description="Add a family to the platform and provision their children with TATI IDs"
          action={{
            label: "Get Started",
            onClick: handleEnrolFamily,
          }}
          featured
          tone="primary"
        />

        {/* Activity & Secondary Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity (spans 2 columns on desktop) */}
          <div className="lg:col-span-2">
            <ActivityFeed
              title="Recent Activity"
              items={recentActivity}
              loading={loading}
              emptyMessage="No recent activity. Start by enrolling a family."
            />
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground px-1">
              Quick Links
            </h3>
            <button
              onClick={handleViewFamilies}
              className="w-full p-4 rounded-lg border border-border hover:bg-secondary transition-colors text-left"
            >
              <p className="font-semibold text-sm text-foreground">
                View All Families
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Manage family records
              </p>
            </button>
            {/* TODO: Add more quick links as features are implemented */}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
