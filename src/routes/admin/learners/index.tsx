/**
 * Admin — Learners directory.
 * Real Firestore data via the admin-only listLearnersAdmin server function.
 */

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  RefreshCw,
  Search,
  BookOpen,
  Award,
} from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { formatDate, StatusBadge } from "@/components/admin/family-format";
import {
  listLearnersAdmin,
  type AdminLearnerOption,
} from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/learners/")({
  head: () => ({ meta: [{ title: "Learners — TATI ChildSave admin" }] }),
  component: LearnersPage,
});

type SortField = "name" | "family" | "age" | "tatiId";
type SortOrder = "asc" | "desc";

function LearnersPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "learners"],
    queryFn: () => listLearnersAdmin(),
    staleTime: 30_000,
  });

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const learners = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = learners.filter((l) => {
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.familyName.toLowerCase().includes(q) ||
        (l.tatiId?.toLowerCase().includes(q) ?? false)
      );
    });

    // Sort
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "family":
          aVal = a.familyName;
          bVal = b.familyName;
          break;
        case "age":
          aVal = a.age ?? 0;
          bVal = b.age ?? 0;
          break;
        case "tatiId":
          aVal = a.tatiId ?? "";
          bVal = b.tatiId ?? "";
          break;
      }

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [learners, search, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <AdminWorkspace title="Learners" active="learners">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1
            className={cn(
              "text-[26px] font-extrabold leading-tight sm:text-[30px]",
              t.navy
            )}
          >
            Learners
          </h1>
          <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
            Every active learner in TATI ChildSave, organized by family.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className={cn(
          "mt-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4",
          t.card
        )}
      >
        <label className="relative flex-1">
          <span className="sr-only">Search learners</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A8]" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by learner name, family or TATI ID"
            className="h-10 w-full rounded-lg border border-[#E4E9F2] bg-[#F9FAFD] pl-9 pr-3 text-[14px] text-[#13215A] placeholder:text-[#8A93A8] focus:border-[#1C5AD6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1C5AD6]/20"
          />
        </label>
        <button
          type="button"
          onClick={() => void refetch()}
          aria-label="Refresh learners"
          title="Refresh"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg text-[#5B6478] hover:bg-[#F4F6FB]",
            t.focus
          )}
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin")}
            aria-hidden
          />
        </button>
      </div>

      {/* Body */}
      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <div className={cn("p-6", t.card)} role="alert">
            <p className="text-[15px] font-extrabold text-[#B42318]">
              We couldn't load the learners.
            </p>
            <p className={cn("mt-1 text-[14px]", t.muted)}>
              {error instanceof Error && /admin/i.test(error.message)
                ? "Your account doesn't have administrator access. Sign in with an admin account."
                : "Check your connection or sign in again, then retry."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(
                "mt-3 rounded-lg bg-white px-3 py-1.5 text-[14px] font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4]",
                t.focus
              )}
            >
              Try again
            </button>
          </div>
        ) : learners.length === 0 ? (
          <div className={cn("px-6 py-12 text-center", t.card)}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9F1FE] text-[#1C5AD6]">
              <BookOpen className="h-6 w-6" aria-hidden />
            </span>
            <p className={cn("mt-3 text-[16px] font-extrabold", t.navy)}>
              No learners yet
            </p>
            <p className={cn("mx-auto mt-1 max-w-md text-[14px]", t.muted)}>
              Enrol families and provision their children to see learners appear
              here.
            </p>
          </div>
        ) : (
          <>
            <p
              className={cn(
                "mb-2 px-1 text-[13px] font-semibold",
                t.muted
              )}
              aria-live="polite"
            >
              {filtered.length === learners.length
                ? `${learners.length} ${
                    learners.length === 1 ? "learner" : "learners"
                  }`
                : `${filtered.length} of ${learners.length} learners`}
            </p>
            {filtered.length === 0 ? (
              <div className={cn("px-6 py-10 text-center", t.card)}>
                <p className={cn("text-[15px] font-extrabold", t.navy)}>
                  No learners match
                </p>
                <p className={cn("mt-1 text-[14px]", t.muted)}>
                  Try a different search.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <LearnersTable
                  learners={filtered}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={toggleSort}
                />
                {/* Mobile Cards */}
                <LearnersCards learners={filtered} />
              </>
            )}
          </>
        )}
      </div>
    </AdminWorkspace>
  );
}

interface LearnersTableProps {
  learners: AdminLearnerOption[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

function LearnersTable({
  learners,
  sortField,
  sortOrder,
  onSort,
}: LearnersTableProps) {
  return (
    <div className={cn("hidden overflow-hidden md:block", t.card)}>
      <table className="w-full">
        <thead className="bg-[#F9FAFD]">
          <tr className="border-b border-[#E4E9F2]">
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => onSort("name")}
                className={cn(
                  "inline-flex items-center gap-1 text-[13px] font-bold hover:text-[#1C5AD6]",
                  sortField === "name" ? "text-[#1C5AD6]" : "text-[#5B6478]"
                )}
              >
                Learner
                {sortField === "name" && (
                  <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => onSort("family")}
                className={cn(
                  "inline-flex items-center gap-1 text-[13px] font-bold hover:text-[#1C5AD6]",
                  sortField === "family"
                    ? "text-[#1C5AD6]"
                    : "text-[#5B6478]"
                )}
              >
                Family
                {sortField === "family" && (
                  <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => onSort("age")}
                className={cn(
                  "inline-flex items-center gap-1 text-[13px] font-bold hover:text-[#1C5AD6]",
                  sortField === "age" ? "text-[#1C5AD6]" : "text-[#5B6478]"
                )}
              >
                Age
                {sortField === "age" && (
                  <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => onSort("tatiId")}
                className={cn(
                  "inline-flex items-center gap-1 text-[13px] font-bold hover:text-[#1C5AD6]",
                  sortField === "tatiId"
                    ? "text-[#1C5AD6]"
                    : "text-[#5B6478]"
                )}
              >
                TATI ID
                {sortField === "tatiId" && (
                  <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {learners.map((learner) => (
            <tr
              key={`${learner.familyId}-${learner.childId}`}
              className="border-b border-[#E4E9F2] hover:bg-[#F9FAFD]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {learner.avatar ? (
                    <img
                      src={learner.avatar}
                      alt={learner.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E3ECFC] text-[12px] font-bold text-[#1C5AD6]">
                      {learner.name
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#13215A] truncate">
                      {learner.name}
                    </p>
                    <p className="text-[12px] text-[#8A93A8]">
                      ID: {learner.childId.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[14px] text-[#5B6478]">
                {learner.familyName}
              </td>
              <td className="px-4 py-3 text-[14px] text-[#5B6478]">
                {learner.age ? `${learner.age} years` : "—"}
              </td>
              <td className="px-4 py-3 text-[14px] font-mono text-[#1C5AD6]">
                {learner.tatiId ? (
                  <span className="inline-block rounded bg-[#E9F1FE] px-2 py-1 text-[12px] font-semibold">
                    {learner.tatiId}
                  </span>
                ) : (
                  <span className="text-[#D4A574]">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LearnersCards({ learners }: { learners: AdminLearnerOption[] }) {
  return (
    <div className="grid gap-3 md:hidden">
      {learners.map((learner) => (
        <div
          key={`${learner.familyId}-${learner.childId}`}
          className={cn("flex items-start gap-3 p-4 hover:bg-[#F9FAFD]", t.card)}
        >
          <div className="flex-shrink-0">
            {learner.avatar ? (
              <img
                src={learner.avatar}
                alt={learner.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3ECFC] text-[12px] font-bold text-[#1C5AD6]">
                {learner.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("text-[14px] font-bold truncate", t.navy)}>
                  {learner.name}
                </p>
                <p className={cn("mt-0.5 text-[13px]", t.muted)}>
                  {learner.familyName}
                </p>
              </div>
              <Award className="h-4 w-4 flex-shrink-0 text-[#F4BA46]" aria-hidden />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {learner.age && (
                <span className="text-[12px] text-[#5B6478]">
                  Age {learner.age}
                </span>
              )}
              {learner.tatiId ? (
                <span className="inline-block rounded bg-[#E9F1FE] px-2 py-1 text-[11px] font-semibold text-[#1C5AD6]">
                  {learner.tatiId}
                </span>
              ) : (
                <span className="text-[12px] text-[#D4A574]">Pending ID</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className={cn("space-y-2 md:space-y-0", t.card)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse border-b border-[#E4E9F2] bg-gradient-to-r from-[#F9FAFD] to-[#F4F6FB] last:border-b-0 md:h-16"
        />
      ))}
    </div>
  );
}
