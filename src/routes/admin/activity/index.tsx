/**
 * Admin — Activity Feed.
 * Real-time platform activity tracking and monitoring.
 * Shows recent events: family enrollments, learner progress, facilitator actions.
 */

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Users,
  BookOpen,
  UserCheck,
  TrendingUp,
  LogIn,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Filter,
} from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import {
  listFamiliesAdmin,
  listLearnersAdmin,
  listFacilitatorsAdmin,
} from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/activity/")({
  head: () => ({ meta: [{ title: "Activity Feed — TATI ChildSave admin" }] }),
  component: ActivityFeedPage,
});

type ActivityType = "all" | "enrollment" | "progress" | "access" | "account";

interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  category: string;
  icon: React.ReactNode;
  color: string;
  priority: "high" | "medium" | "low";
}

function ActivityFeedPage() {
  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["admin", "families"],
    queryFn: () => listFamiliesAdmin(),
    staleTime: 60_000,
  });

  const { data: learners, isLoading: learnersLoading } = useQuery({
    queryKey: ["admin", "learners"],
    queryFn: () => listLearnersAdmin(),
    staleTime: 60_000,
  });

  const { data: facilitators, isLoading: facilitatorsLoading } = useQuery({
    queryKey: ["admin", "facilitators"],
    queryFn: () => listFacilitatorsAdmin(),
    staleTime: 60_000,
  });

  const [selectedFilter, setSelectedFilter] = useState<ActivityType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate activities from all sources
  const allActivities: ActivityEvent[] = useMemo(() => {
    const activities: ActivityEvent[] = [];

    // Add family enrollment activities
    if (families) {
      families.forEach((family) => {
        // Main enrollment event
        activities.push({
          id: `family-${family.id}-enroll`,
          type: "enrollment",
          title: `Family enrolled: ${family.displayName || "Unknown"}`,
          description: `${family.learners.length} learner${family.learners.length !== 1 ? "s" : ""} registered`,
          timestamp: family.createdAt ? new Date(family.createdAt) : new Date(),
          category: "Family",
          icon: <Users className="h-5 w-5" aria-hidden />,
          color: "bg-blue-50 text-blue-700 border-blue-200",
          priority: "high",
        });

        // Parent setup events
        family.parents.forEach((parent) => {
          activities.push({
            id: `parent-${parent.uid}-setup`,
            type: "account",
            title: `Parent account created: ${parent.displayName || parent.email}`,
            description: "Parent registered and set up their account",
            timestamp: family.createdAt ? new Date(family.createdAt) : new Date(),
            category: "Account",
            icon: <UserCheck className="h-5 w-5" aria-hidden />,
            color: "bg-green-50 text-green-700 border-green-200",
            priority: "medium",
          });
        });
      });
    }

    // Add learner progress activities
    if (learners) {
      learners.forEach((learner) => {
        activities.push({
          id: `learner-${learner.id}-progress`,
          type: "progress",
          title: `Learner enrolled: ${learner.displayName || "Unknown"}`,
          description: `Enrolled in ${learner.tatiId ? "TATI program" : "awaiting provisioning"}`,
          timestamp: learner.createdAt ? new Date(learner.createdAt) : new Date(),
          category: "Learner",
          icon: <BookOpen className="h-5 w-5" aria-hidden />,
          color: "bg-purple-50 text-purple-700 border-purple-200",
          priority: "medium",
        });

        // Add provisioning completion if applicable
        if (learner.tatiId) {
          activities.push({
            id: `learner-${learner.id}-provisioned`,
            type: "access",
            title: `Learner provisioned: ${learner.displayName || "Unknown"}`,
            description: `TATI ID assigned: ${learner.tatiId}`,
            timestamp: learner.createdAt ? new Date(learner.createdAt) : new Date(),
            category: "Provisioning",
            icon: <CheckCircle2 className="h-5 w-5" aria-hidden />,
            color: "bg-emerald-50 text-emerald-700 border-emerald-200",
            priority: "high",
          });
        }
      });
    }

    // Add facilitator activities
    if (facilitators) {
      facilitators.forEach((facilitator) => {
        activities.push({
          id: `facilitator-${facilitator.uid}-setup`,
          type: "account",
          title: `Facilitator account created: ${facilitator.displayName || facilitator.email}`,
          description: "Facilitator registered and authorized",
          timestamp: facilitator.createdAt ? new Date(facilitator.createdAt) : new Date(),
          category: "Account",
          icon: <LogIn className="h-5 w-5" aria-hidden />,
          color: "bg-orange-50 text-orange-700 border-orange-200",
          priority: "medium",
        });
      });
    }

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [families, learners, facilitators]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return allActivities.filter((activity) => {
      const matchesFilter = selectedFilter === "all" || activity.type === selectedFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [allActivities, selectedFilter, searchQuery]);

  const isLoading = familiesLoading || learnersLoading || facilitatorsLoading;

  return (
    <AdminWorkspace title="Activity" active="activity">
      {/* Header */}
      <div className="mb-6">
        <h1 className={cn("text-[26px] font-extrabold leading-tight sm:text-[30px]", t.navy)}>
          Activity Feed
        </h1>
        <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
          Real-time overview of platform activities and events.
        </p>
      </div>

      {/* Toolbar */}
      <div className={cn("mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-3 sm:p-4", t.card)}>
        <div className="relative flex-1">
          <span className="sr-only">Search activities</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description or category"
            className="h-10 w-full rounded-lg border border-[#E4E9F2] bg-[#F9FAFD] pl-3 pr-3 text-[14px] text-[#13215A] placeholder:text-[#8A93A8] focus:border-[#1C5AD6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1C5AD6]/20"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by activity type">
          {(["all", "enrollment", "progress", "access", "account"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter)}
              aria-pressed={selectedFilter === filter}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-bold capitalize transition-colors",
                selectedFilter === filter
                  ? "bg-[#1C5AD6] text-white"
                  : "border border-[#E4E9F2] bg-white text-[#5B6478] hover:border-[#D7E1F4]",
                t.focus,
              )}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn("h-20 animate-pulse", t.card)}
                aria-busy="true"
                aria-label="Loading activity"
              />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className={cn("px-6 py-12 text-center", t.card)}>
            <Clock className="mx-auto h-12 w-12 text-[#D7E1F4]" aria-hidden />
            <p className={cn("mt-3 text-[16px] font-extrabold", t.navy)}>No activities found</p>
            <p className={cn("mx-auto mt-1 max-w-md text-[14px]", t.muted)}>
              {searchQuery.trim() !== ""
                ? "Try adjusting your search or filter"
                : "Activity will appear here as families, learners, and facilitators are added"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity, index) => {
              const prevActivity = index > 0 ? filteredActivities[index - 1] : null;
              const isSameDay =
                prevActivity &&
                activity.timestamp.toDateString() === prevActivity.timestamp.toDateString();

              return (
                <div key={activity.id}>
                  {/* Date separator */}
                  {!isSameDay && (
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex-1 border-t border-[#E4E9F2]" aria-hidden />
                      <span className={cn("text-[12px] font-bold uppercase", t.muted)}>
                        {formatActivityDate(activity.timestamp)}
                      </span>
                      <div className="flex-1 border-t border-[#E4E9F2]" aria-hidden />
                    </div>
                  )}

                  {/* Activity card */}
                  <div
                    className={cn(
                      "flex gap-4 border-l-4 p-4 transition-all hover:shadow-sm",
                      activity.color,
                      t.card,
                    )}
                  >
                    {/* Icon */}
                    <div className="shrink-0 pt-1">{activity.icon}</div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className={cn("text-[15px] font-extrabold", t.navy)}>
                            {activity.title}
                          </h3>
                          <p className={cn("mt-1 text-[14px]", t.muted)}>{activity.description}</p>
                        </div>
                        <span className="inline-flex shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold uppercase">
                          {activity.priority === "high" && <span className="text-red-600">High</span>}
                          {activity.priority === "medium" && <span className="text-yellow-600">Medium</span>}
                          {activity.priority === "low" && <span className="text-green-600">Low</span>}
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
                        <span className="inline-block rounded bg-white px-2 py-1 font-semibold opacity-75">
                          {activity.category}
                        </span>
                        <span className="text-xs opacity-60">
                          {formatActivityTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className={cn("mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4", t.card, "p-4")}>
        <StatItem
          label="Total Events"
          value={allActivities.length}
          icon={<Clock className="h-5 w-5" aria-hidden />}
        />
        <StatItem
          label="Enrollments"
          value={allActivities.filter((a) => a.type === "enrollment").length}
          icon={<Users className="h-5 w-5" aria-hidden />}
        />
        <StatItem
          label="Progress"
          value={allActivities.filter((a) => a.type === "progress").length}
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
        />
        <StatItem
          label="Accounts"
          value={allActivities.filter((a) => a.type === "account").length}
          icon={<UserCheck className="h-5 w-5" aria-hidden />}
        />
      </div>
    </AdminWorkspace>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatItem({ label, value, icon }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C5AD6] text-white">
        {icon}
      </div>
      <p className={cn("mt-2 text-[13px] font-medium", t.muted)}>{label}</p>
      <p className={cn("mt-0.5 text-[20px] font-extrabold", t.navy)}>{value}</p>
    </div>
  );
}

function formatActivityDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function formatActivityTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}
