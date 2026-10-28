/**
 * Admin — Analytics & Reports.
 * Dashboard with key metrics, trends, and export functionality.
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  TrendingUp,
  Users,
  BookOpen,
  Award,
  BarChart3,
  Calendar,
} from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import {
  listFamiliesAdmin,
  listLearnersAdmin,
  listFacilitatorsAdmin,
} from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/tati";

export const Route = createFileRoute("/admin/analytics/")({
  head: () => ({ meta: [{ title: "Analytics & Reports — TATI ChildSave admin" }] }),
  component: AnalyticsPage,
});

interface MetricCard {
  label: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  bgColor: string;
}

function AnalyticsPage() {
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

  const activeFamilies = families?.filter((f) => f.status === "active") ?? [];
  const activeLearnersWithIds = learners?.filter((l) => l.tatiId) ?? [];
  const activeLearnersTotal = learners?.length ?? 0;

  const metrics: MetricCard[] = [
    {
      label: "Total Families",
      value: activeFamilies.length,
      icon: <Users className="w-5 h-5" />,
      bgColor: "bg-blue-50",
    },
    {
      label: "Active Learners",
      value: activeLearnersTotal,
      icon: <BookOpen className="w-5 h-5" />,
      bgColor: "bg-green-50",
    },
    {
      label: "Provisioned Learners",
      value: activeLearnersWithIds.length,
      icon: <Award className="w-5 h-5" />,
      bgColor: "bg-purple-50",
    },
    {
      label: "Facilitators",
      value: facilitators?.length ?? 0,
      icon: <Users className="w-5 h-5" />,
      bgColor: "bg-orange-50",
    },
  ];

  const isLoading = familiesLoading || learnersLoading || facilitatorsLoading;

  return (
    <AdminWorkspace title="Analytics & Reports" active="analytics">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1
            className={cn(
              "text-[26px] font-extrabold leading-tight sm:text-[30px]",
              t.navy
            )}
          >
            Analytics & Reports
          </h1>
          <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
            Platform metrics, trends, and insights at a glance.
          </p>
        </div>
        <Button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => handleExportReport()}
        >
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={cn("rounded-xl border border-gray-200 p-5", t.card)}
          >
            <div
              className={`${metric.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}
            >
              {metric.icon}
            </div>
            <p className={cn("text-xs font-semibold mb-1", t.muted)}>
              {metric.label.toUpperCase()}
            </p>
            {isLoading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </p>
                {metric.change && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {metric.change > 0 ? "+" : ""}{metric.change}% ({metric.changeLabel})
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Charts & Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Enrollment Trend */}
        <div className={cn("rounded-xl border border-gray-200 p-6", t.card)}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Enrollment Trend</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">This Month</span>
                <span className="text-sm font-bold text-gray-900">
                  {activeFamilies.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(activeFamilies.length * 10, 100)}%`,
                  }}
                />
              </div>
            </div>
            <p className={cn("text-xs", t.muted)}>
              Families enrolled and active on the platform
            </p>
          </div>
        </div>

        {/* Provisioning Status */}
        <div className={cn("rounded-xl border border-gray-200 p-6", t.card)}>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">Provisioning Status</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  Learners Provisioned
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {activeLearnersWithIds.length} / {activeLearnersTotal}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      activeLearnersTotal > 0
                        ? (activeLearnersWithIds.length / activeLearnersTotal) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <p className={cn("text-xs", t.muted)}>
              {((activeLearnersWithIds.length / Math.max(activeLearnersTotal, 1)) * 100).toFixed(0)}% of
              learners have TATI IDs
            </p>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className={cn("rounded-xl border border-gray-200 p-6", t.card)}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Insights</h3>
        <div className="space-y-3">
          <InsightCard
            icon={<Users className="w-5 h-5 text-blue-600" />}
            title="Enrollment"
            description={`${activeFamilies.length} families enrolled. Keep promoting to schools for increased uptake.`}
          />
          <InsightCard
            icon={<BookOpen className="w-5 h-5 text-green-600" />}
            title="Learner Provisioning"
            description={`${activeLearnersWithIds.length} of ${activeLearnersTotal} learners provisioned. Complete the remaining ${activeLearnersTotal - activeLearnersWithIds.length} for full access.`}
          />
          <InsightCard
            icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
            title="Platform Activity"
            description="Monitor learner engagement and progress through the Activity Feed on the dashboard."
          />
        </div>
      </div>

      {/* Export Section */}
      <div className={cn("rounded-xl border border-gray-200 p-6 mt-8", t.card)}>
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Export Reports</h3>
        </div>
        <p className={cn("text-sm mb-4", t.muted)}>
          Download detailed reports for external analysis or documentation.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => exportAsCSV("families")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Families (CSV)
          </Button>
          <Button
            onClick={() => exportAsCSV("learners")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Learners (CSV)
          </Button>
          <Button
            onClick={() => exportAsCSV("facilitators")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Facilitators (CSV)
          </Button>
        </div>
      </div>
    </AdminWorkspace>
  );
}

function InsightCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-gray-600 text-sm mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function handleExportReport() {
  // Placeholder for full report export
  alert("Full report export coming soon. Use the CSV exports below.");
}

function exportAsCSV(type: "families" | "learners" | "facilitators") {
  // Placeholder for CSV export
  alert(`Exporting ${type} as CSV...`);
}
