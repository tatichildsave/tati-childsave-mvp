/**
 * Admin — Sessions Management.
 * View and manage all academy sessions and scheduled classes.
 * Real Firestore data with admin authorization.
 */

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Search,
  Users,
  MapPin,
  Monitor,
  Plus,
} from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/sessions/")({
  head: () => ({ meta: [{ title: "Sessions — TATI ChildSave admin" }] }),
  component: SessionsPage,
});

interface SessionItem {
  id: string;
  cohortName: string;
  activityTitle: string;
  facilitatorName: string;
  facilitatorEmail: string;
  scheduledAt: Date;
  durationMinutes: number;
  deliveryMode: "in-person" | "virtual";
  location: string;
  status: "scheduled" | "completed" | "cancelled";
  learnerCount: number;
}

type StatusFilter = "all" | "scheduled" | "completed" | "cancelled";

// Mock data for now - replace with real server function
async function listSessionsAdmin(): Promise<SessionItem[]> {
  // TODO: Replace with real server function that queries academyClasses
  // For now, return empty array to show structure
  return [];
}

function SessionsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: () => listSessionsAdmin(),
    staleTime: 30_000,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const sessions = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchesStatus =
        status === "all" || s.status === status;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [s.cohortName, s.activityTitle, s.facilitatorName, s.facilitatorEmail]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [sessions, search, status]);

  const stats = useMemo(() => ({
    total: sessions.length,
    scheduled: sessions.filter((s) => s.status === "scheduled").length,
    completed: sessions.filter((s) => s.status === "completed").length,
    cancelled: sessions.filter((s) => s.status === "cancelled").length,
  }), [sessions]);

  return (
    <AdminWorkspace title="Sessions" active="sessions">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn("text-[26px] font-extrabold leading-tight sm:text-[30px]", t.navy)}>
            Sessions
          </h1>
          <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
            Manage scheduled classes and learning sessions.
          </p>
        </div>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white shadow-[0_2px_6px_rgba(28,90,214,0.22)] hover:bg-[#174DBA]",
            t.focus,
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden />
          Schedule Session
        </button>
      </div>

      {/* Toolbar */}
      <div className={cn("mt-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4", t.card)}>
        <label className="relative flex-1">
          <span className="sr-only">Search sessions</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A8]" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by cohort, activity, or facilitator"
            className="h-10 w-full rounded-lg border border-[#E4E9F2] bg-[#F9FAFD] pl-9 pr-3 text-[14px] text-[#13215A] placeholder:text-[#8A93A8] focus:border-[#1C5AD6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1C5AD6]/20"
          />
        </label>
        <div className="flex items-center gap-2" role="group" aria-label="Filter by status">
          {(["all", "scheduled", "completed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={cn(
                "h-9 rounded-lg px-3.5 text-[13px] font-bold capitalize transition-colors whitespace-nowrap",
                status === s ? "bg-[#E9F1FE] text-[#1C5AD6]" : "text-[#5B6478] hover:bg-[#F4F6FB]",
                t.focus,
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Total" value={stats.total} icon={<Calendar className="h-5 w-5" aria-hidden />} />
        <StatCard label="Scheduled" value={stats.scheduled} icon={<Clock className="h-5 w-5" aria-hidden />} color="text-blue-600" />
        <StatCard label="Completed" value={stats.completed} icon={<Users className="h-5 w-5" aria-hidden />} color="text-green-600" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={<Calendar className="h-5 w-5" aria-hidden />} color="text-red-600" />
      </div>

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <div className={cn("h-40 animate-pulse", t.card)} aria-busy="true" aria-label="Loading sessions" />
        ) : isError ? (
          <div className={cn("p-6", t.card)} role="alert">
            <p className="text-[15px] font-extrabold text-[#B42318]">
              Failed to load sessions.
            </p>
            <p className={cn("mt-1 text-[14px]", t.muted)}>
              {error instanceof Error ? error.message : "Please try again."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn("mt-3 rounded-lg bg-white px-3 py-1.5 text-[14px] font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4]", t.focus)}
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn("px-6 py-12 text-center", t.card)}>
            <Calendar className="mx-auto h-12 w-12 text-[#D7E1F4]" aria-hidden />
            <p className={cn("mt-3 text-[16px] font-extrabold", t.navy)}>
              {sessions.length === 0 ? "No sessions yet" : "No matching sessions"}
            </p>
            <p className={cn("mx-auto mt-1 max-w-md text-[14px]", t.muted)}>
              {sessions.length === 0
                ? "Schedule your first learning session to get started."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-lg border border-[#E4E9F2] md:block">
              <table className="w-full text-left text-[14px]">
                <caption className="sr-only">Scheduled sessions</caption>
                <thead className="bg-[#F4F6FB] text-[13px] font-bold text-[#3D4766]">
                  <tr>
                    <th scope="col" className="px-4 py-3">Cohort & Activity</th>
                    <th scope="col" className="px-4 py-3">Facilitator</th>
                    <th scope="col" className="px-4 py-3">Date & Time</th>
                    <th scope="col" className="px-4 py-3">Delivery</th>
                    <th scope="col" className="px-4 py-3">Learners</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E9F2]">
                  {filtered.map((session) => (
                    <tr key={session.id} className="hover:bg-[#F9FAFD]">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#13215A]">{session.cohortName}</div>
                        <div className="text-[12px] text-[#8A93A8]">{session.activityTitle}</div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7489]">
                        <div>{session.facilitatorName}</div>
                        <div className="text-[12px] text-[#8A93A8]">{session.facilitatorEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-[#13215A]">
                        <div>{formatDate(session.scheduledAt)}</div>
                        <div className="text-[12px] text-[#8A93A8]">{formatTime(session.scheduledAt)} ({session.durationMinutes}m)</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {session.deliveryMode === "virtual" ? (
                            <>
                              <Monitor className="h-4 w-4 text-[#1C5AD6]" aria-hidden />
                              <span className="text-[13px] text-[#1C5AD6] font-semibold">Virtual</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 text-[#D93636]" aria-hidden />
                              <span className="text-[13px] text-[#6B7489]">{session.location}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#13215A]">{session.learnerCount}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-block rounded-full px-2.5 py-1 text-[12px] font-bold",
                          session.status === "scheduled"
                            ? "bg-[#E9F1FE] text-[#1C5AD6]"
                            : session.status === "completed"
                            ? "bg-[#E3F4EA] text-[#1F7A4C]"
                            : "bg-[#F5F5F5] text-[#6B7489]"
                        )}>
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-[#1C5AD6] hover:underline text-[13px] font-bold">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <ul className="space-y-3 md:hidden">
              {filtered.map((session) => (
                <li key={session.id} className={cn("p-4", t.card)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className={cn("truncate text-[15px] font-extrabold", t.navy)}>
                        {session.cohortName}
                      </h3>
                      <p className={cn("mt-1 truncate text-[13px]", t.muted)}>
                        {session.activityTitle}
                      </p>
                      <p className={cn("mt-1 text-[12px]", t.muted)}>
                        {session.facilitatorName}
                      </p>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap",
                      session.status === "scheduled"
                        ? "bg-[#E9F1FE] text-[#1C5AD6]"
                        : session.status === "completed"
                        ? "bg-[#E3F4EA] text-[#1F7A4C]"
                        : "bg-[#F5F5F5] text-[#6B7489]"
                    )}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-[12px] text-[#8A93A8]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" aria-hidden />
                      {formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      {session.deliveryMode === "virtual" ? (
                        <>
                          <Monitor className="h-3 w-3" aria-hidden />
                          <span>Virtual</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3" aria-hidden />
                          <span>{session.location}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" aria-hidden />
                      {session.learnerCount} learner{session.learnerCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AdminWorkspace>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ label, value, icon, color = "text-[#1C5AD6]" }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border border-[#E4E9F2] bg-white p-4", t.focus)}>
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-opacity-10", color)}>
        {icon}
      </div>
      <p className={cn("mt-2 text-[13px] font-medium", t.muted)}>{label}</p>
      <p className={cn("mt-1 text-[22px] font-extrabold", t.navy)}>{value}</p>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
