/**
 * Admin — Families directory.
 * Real Firestore data via the admin-only listFamiliesAdmin server function.
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, RefreshCw, Search, Users } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { familyDisplayName, formatDate, StatusBadge } from "@/components/admin/family-format";
import { listFamiliesAdmin, type AdminFamilySummary } from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/families/")({
  head: () => ({ meta: [{ title: "Families — TATI ChildSave admin" }] }),
  component: FamiliesPage,
});

type StatusFilter = "all" | "active" | "inactive";

function FamiliesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "families"],
    queryFn: () => listFamiliesAdmin(),
    staleTime: 30_000,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const families = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return families.filter((f) => {
      const matchesStatus =
        status === "all" || (status === "active" ? f.status === "active" : f.status !== "active");
      if (!matchesStatus) return false;
      if (!q) return true;
      return [familyDisplayName(f), ...f.parents.flatMap((p) => [p.displayName ?? "", p.email ?? ""])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [families, search, status]);

  return (
    <AdminWorkspace title="Families" active="families">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn("text-[26px] font-extrabold leading-tight sm:text-[30px]", t.navy)}>Families</h1>
          <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
            Every family enrolled in TATI ChildSave, with their parents and learners.
          </p>
        </div>
        <Link
          to="/admin/enroll"
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white shadow-[0_2px_6px_rgba(28,90,214,0.22)] hover:bg-[#174DBA]",
            t.focus,
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden />
          Enrol New Family
        </Link>
      </div>

      {/* Toolbar */}
      <div className={cn("mt-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4", t.card)}>
        <label className="relative flex-1">
          <span className="sr-only">Search families</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A8]" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by family, parent name or email"
            className="h-10 w-full rounded-lg border border-[#E4E9F2] bg-[#F9FAFD] pl-9 pr-3 text-[14px] text-[#13215A] placeholder:text-[#8A93A8] focus:border-[#1C5AD6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1C5AD6]/20"
          />
        </label>
        <div className="flex items-center gap-2" role="group" aria-label="Filter by status">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={cn(
                "h-9 rounded-lg px-3.5 text-[13px] font-bold capitalize transition-colors",
                status === s ? "bg-[#E9F1FE] text-[#1C5AD6]" : "text-[#5B6478] hover:bg-[#F4F6FB]",
                t.focus,
              )}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void refetch()}
            aria-label="Refresh families"
            title="Refresh"
            className={cn("ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-[#5B6478] hover:bg-[#F4F6FB]", t.focus)}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <div className={cn("p-6", t.card)} role="alert">
            <p className="text-[15px] font-extrabold text-[#B42318]">We couldn't load the families.</p>
            <p className={cn("mt-1 text-[14px]", t.muted)}>
              {error instanceof Error && /admin/i.test(error.message)
                ? "Your account doesn't have administrator access. Sign in with an admin account."
                : "Check your connection or sign in again, then retry."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn("mt-3 rounded-lg bg-white px-3 py-1.5 text-[14px] font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4]", t.focus)}
            >
              Try again
            </button>
          </div>
        ) : families.length === 0 ? (
          <div className={cn("px-6 py-12 text-center", t.card)}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9F1FE] text-[#1C5AD6]">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <p className={cn("mt-3 text-[16px] font-extrabold", t.navy)}>No families yet</p>
            <p className={cn("mx-auto mt-1 max-w-md text-[14px]", t.muted)}>
              Enrol the first family to create the parent account and provision each child's TATI ID and PIN.
            </p>
            <Link
              to="/admin/enroll"
              className={cn("mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white", t.focus)}
            >
              <Plus className="h-4 w-4" aria-hidden /> Enrol New Family
            </Link>
          </div>
        ) : (
          <>
            <p className={cn("mb-2 px-1 text-[13px] font-semibold", t.muted)} aria-live="polite">
              {filtered.length === families.length
                ? `${families.length} ${families.length === 1 ? "family" : "families"}`
                : `${filtered.length} of ${families.length} families`}
            </p>
            {filtered.length === 0 ? (
              <div className={cn("px-6 py-10 text-center", t.card)}>
                <p className={cn("text-[15px] font-extrabold", t.navy)}>No families match</p>
                <p className={cn("mt-1 text-[14px]", t.muted)}>Try a different search or status filter.</p>
              </div>
            ) : (
              <>
                <FamiliesTable families={filtered} />
                <FamiliesCards families={filtered} />
              </>
            )}
          </>
        )}
      </div>
    </AdminWorkspace>
  );
}

function parentLine(f: AdminFamilySummary) {
  if (f.parents.length === 0) return { name: "No parent linked", email: null };
  const p = f.parents[0]!;
  const extra = f.parents.length > 1 ? ` +${f.parents.length - 1}` : "";
  return { name: (p.displayName ?? p.email ?? "Parent") + extra, email: p.email };
}

function FamiliesTable({ families }: { families: AdminFamilySummary[] }) {
  return (
    <div className={cn("hidden overflow-hidden md:block", t.card)}>
      <table className="w-full table-fixed text-left text-[14px]">
        <caption className="sr-only">Enrolled families</caption>
        <thead className="border-b border-[#EEF1F6] bg-[#F9FAFD] text-[12px] font-bold uppercase tracking-wide text-[#6B7489]">
          <tr>
            <th scope="col" className="w-[30%] px-5 py-3">Family</th>
            <th scope="col" className="w-[30%] px-3 py-3">Parent</th>
            <th scope="col" className="w-[11%] px-3 py-3">Children</th>
            <th scope="col" className="w-[14%] px-3 py-3">Enrolled</th>
            <th scope="col" className="w-[11%] px-3 py-3">Status</th>
            <th scope="col" className="w-[4%] px-3 py-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F6]">
          {families.map((f) => {
            const parent = parentLine(f);
            return (
              <tr key={f.id} className="group relative hover:bg-[#F9FAFD]">
                <td className="px-5 py-3.5">
                  <Link
                    to="/admin/families/$familyId"
                    params={{ familyId: f.id }}
                    className={cn("block truncate font-extrabold text-[#13215A] after:absolute after:inset-0 group-hover:text-[#1C5AD6]", t.focus)}
                  >
                    {familyDisplayName(f)}
                  </Link>
                </td>
                <td className="px-3 py-3.5">
                  <span className="block truncate font-semibold text-[#3D4766]">{parent.name}</span>
                  {parent.email ? <span className="block truncate text-[12.5px] text-[#6B7489]">{parent.email}</span> : null}
                </td>
                <td className="px-3 py-3.5 font-bold text-[#13215A]">{f.childrenCount}</td>
                <td className="px-3 py-3.5 text-[#3D4766]">{formatDate(f.enrolmentDate ?? f.createdAt)}</td>
                <td className="px-3 py-3.5"><StatusBadge status={f.status} /></td>
                <td className="px-3 py-3.5 text-[#1C5AD6]"><ChevronRight className="h-5 w-5" aria-hidden /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FamiliesCards({ families }: { families: AdminFamilySummary[] }) {
  return (
    <ul className="space-y-3 md:hidden">
      {families.map((f) => {
        const parent = parentLine(f);
        return (
          <li key={f.id}>
            <Link
              to="/admin/families/$familyId"
              params={{ familyId: f.id }}
              className={cn("flex items-center gap-3 p-4", t.card, t.focus)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate text-[15px] font-extrabold", t.navy)}>{familyDisplayName(f)}</span>
                  <StatusBadge status={f.status} />
                </div>
                <p className="mt-1 truncate text-[13px] font-semibold text-[#3D4766]">{parent.name}</p>
                <p className={cn("mt-0.5 text-[12.5px]", t.muted)}>
                  {f.childrenCount} {f.childrenCount === 1 ? "child" : "children"} · Enrolled {formatDate(f.enrolmentDate ?? f.createdAt)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#1C5AD6]" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className={cn("space-y-0 overflow-hidden", t.card)} aria-busy="true" aria-label="Loading families">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-[#EEF1F6] px-5 py-4 last:border-0">
          <span className="h-4 w-1/4 animate-pulse rounded bg-[#EEF2F8]" />
          <span className="h-4 w-1/4 animate-pulse rounded bg-[#F2F5FA]" />
          <span className="h-4 w-12 animate-pulse rounded bg-[#F2F5FA]" />
        </div>
      ))}
    </div>
  );
}
