/**
 * Admin — Facilitator detail: cohorts and learner assignment.
 * Every change goes through admin-only server functions that update the cohort,
 * facilitatorAssignments and each child's facilitatorUids in one transaction.
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Pencil, Phone, Plus, Search, ShieldCheck, Users, X } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { formatDate, StatusBadge } from "@/components/admin/family-format";
import { Avatar } from "@/components/tati";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getFacilitatorAdmin,
  listLearnersAdmin,
  removeLearnerFromFacilitatorCohort,
  saveFacilitatorCohort,
  type AdminFacilitatorCohort,
} from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/facilitators/$facilitatorUid")({
  head: () => ({ meta: [{ title: "Facilitator — TATI ChildSave admin" }] }),
  component: FacilitatorDetailPage,
});

type EditorState = { mode: "create" } | { mode: "edit"; cohort: AdminFacilitatorCohort } | null;

function FacilitatorDetailPage() {
  const { facilitatorUid } = Route.useParams();
  const qc = useQueryClient();
  const { data: facilitator, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "facilitator", facilitatorUid],
    queryFn: () => getFacilitatorAdmin({ data: { facilitatorUid } }),
    staleTime: 15_000,
  });
  const [editor, setEditor] = useState<EditorState>(null);

  const remove = useMutation({
    mutationFn: (v: { cohortId: string; childId: string }) =>
      removeLearnerFromFacilitatorCohort({ data: { facilitatorUid, ...v } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  return (
    <AdminWorkspace title="Facilitator" active="facilitators">
      <Link
        to="/admin/facilitators"
        className={cn("inline-flex items-center gap-1.5 rounded-md text-[14px] font-bold text-[#1C5AD6] hover:underline", t.focus)}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All facilitators
      </Link>

      {isLoading ? (
        <div className={cn("mt-4 h-40 animate-pulse", t.card)} aria-busy="true" aria-label="Loading facilitator" />
      ) : isError ? (
        <div className={cn("mt-4 p-6", t.card)} role="alert">
          <p className="text-[15px] font-extrabold text-[#B42318]">We couldn't load this facilitator.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className={cn("mt-3 rounded-lg bg-white px-3 py-1.5 text-[14px] font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4]", t.focus)}
          >
            Try again
          </button>
        </div>
      ) : !facilitator ? (
        <div className={cn("mt-4 px-6 py-10 text-center", t.card)}>
          <p className={cn("text-[16px] font-extrabold", t.navy)}>Facilitator not found</p>
        </div>
      ) : (
        <>
          <section className={cn("mt-4 p-5 sm:p-6", t.card)} aria-labelledby="fac-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 id="fac-title" className={cn("text-[24px] font-extrabold leading-tight sm:text-[28px]", t.navy)}>
                  {facilitator.displayName ?? facilitator.email}
                </h1>
                <p className={cn("mt-1 text-[14px]", t.muted)}>
                  Facilitator since {formatDate(facilitator.createdAt)} · {facilitator.learnerCount}{" "}
                  {facilitator.learnerCount === 1 ? "learner" : "learners"} assigned
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px] text-[#3D4766]">
                  {facilitator.email ? (
                    <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-[#8A93A8]" aria-hidden /> {facilitator.email}</span>
                  ) : null}
                  {facilitator.phone ? (
                    <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-[#8A93A8]" aria-hidden /> {facilitator.phone}</span>
                  ) : null}
                </div>
              </div>
              <StatusBadge status={facilitator.status} />
            </div>
          </section>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className={cn("text-[18px] font-extrabold", t.navy)}>Cohorts</h2>
            <button
              type="button"
              onClick={() => setEditor({ mode: "create" })}
              className={cn("inline-flex h-10 items-center gap-2 rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white hover:bg-[#174DBA]", t.focus)}
            >
              <Plus className="h-4 w-4" aria-hidden /> New cohort
            </button>
          </div>

          {facilitator.cohorts.length === 0 ? (
            <div className={cn("mt-3 px-6 py-10 text-center", t.card)}>
              <p className={cn("text-[15px] font-extrabold", t.navy)}>No cohorts yet</p>
              <p className={cn("mx-auto mt-1 max-w-md text-[14px]", t.muted)}>
                Create a cohort and choose its learners. The facilitator can only see learners in their cohorts.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 xl:grid-cols-2">
              {facilitator.cohorts.map((cohort) => (
                <section key={cohort.id} className={cn("p-5", t.card)} aria-label={`Cohort ${cohort.name}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className={cn("truncate text-[16px] font-extrabold", t.navy)}>{cohort.name}</h3>
                      <p className={cn("text-[13px]", t.muted)}>
                        {cohort.learners.length} {cohort.learners.length === 1 ? "learner" : "learners"}
                        {cohort.managedBy !== "admin" ? " · created by the facilitator" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={cohort.status} />
                      {cohort.managedBy === "admin" ? (
                        <button
                          type="button"
                          onClick={() => setEditor({ mode: "edit", cohort })}
                          aria-label={`Edit ${cohort.name}`}
                          className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-[#1C5AD6] hover:bg-[#F4F8FF]", t.focus)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {cohort.learners.length === 0 ? (
                    <p className={cn("mt-3 text-[13.5px]", t.muted)}>No learners in this cohort.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[#EEF1F6]">
                      {cohort.learners.map((l) => (
                        <li key={l.childId} className="flex items-center gap-3 py-2.5">
                          <Avatar {...(l.avatar ? { avatar: l.avatar } : {})} name={l.name} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-[14px] font-bold", t.navy)}>{l.name}</span>
                            <span className={cn("block text-[12.5px]", t.muted)}>
                              {l.age !== null ? `Age ${l.age} · ` : ""}TATI ID {l.tatiId ?? "—"}
                            </span>
                          </span>
                          {cohort.managedBy === "admin" ? (
                            <button
                              type="button"
                              disabled={remove.isPending}
                              onClick={() => remove.mutate({ cohortId: cohort.id, childId: l.childId })}
                              aria-label={`Remove ${l.name} from ${cohort.name}`}
                              className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-[#8A93A8] hover:bg-[#FFF6F6] hover:text-[#B42318] disabled:opacity-50", t.focus)}
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {cohort.missingLearnerIds.length > 0 ? (
                    <p className="mt-2 text-[12.5px] text-[#8A5A00]">
                      {cohort.missingLearnerIds.length} learner record(s) in this cohort aren't assigned or no longer exist.
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          )}

          {remove.isError ? (
            <p className="mt-3 rounded-lg bg-[#FFF6F6] px-3 py-2 text-[13.5px] font-semibold text-[#B42318]" role="alert">
              The learner couldn't be removed. Please try again.
            </p>
          ) : null}

          <p className={cn("mt-5 flex gap-2 text-[12.5px] leading-snug", t.muted)}>
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#22A06B]" aria-hidden />
            Facilitators can read progress only for learners in cohorts you assign here. They can never see parent
            insights, PINs or other families.
          </p>

          <CohortEditor
            facilitatorUid={facilitatorUid}
            state={editor}
            onClose={() => setEditor(null)}
          />
        </>
      )}
    </AdminWorkspace>
  );
}

function CohortEditor({
  facilitatorUid,
  state,
  onClose,
}: {
  facilitatorUid: string;
  state: EditorState;
  onClose: () => void;
}) {
  const open = state !== null;
  const qc = useQueryClient();
  const editing = state?.mode === "edit" ? state.cohort : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Map<string, { familyId: string; childId: string }>>(new Map());
  const [search, setSearch] = useState("");
  const [initialisedFor, setInitialisedFor] = useState<string | null>(null);

  const { data: learners, isLoading } = useQuery({
    queryKey: ["admin", "learners"],
    queryFn: () => listLearnersAdmin(),
    enabled: open,
    staleTime: 30_000,
  });

  const key = editing?.id ?? (open ? "new" : null);
  if (open && initialisedFor !== key) {
    setInitialisedFor(key);
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setSelected(new Map((editing?.learners ?? []).map((l) => [l.childId, { familyId: l.familyId, childId: l.childId }])));
    setSearch("");
  }

  const save = useMutation({
    mutationFn: () =>
      saveFacilitatorCohort({
        data: {
          facilitatorUid,
          ...(editing ? { cohortId: editing.id } : {}),
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          learners: [...selected.values()],
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      close();
    },
  });

  function close() {
    setInitialisedFor(null);
    save.reset();
    onClose();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (learners ?? []).filter(
      (l) => !q || [l.name, l.tatiId ?? "", l.familyName ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [learners, search]);

  function toggle(l: { familyId: string; childId: string }) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(l.childId)) next.delete(l.childId);
      else next.set(l.childId, { familyId: l.familyId, childId: l.childId });
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New cohort"}</DialogTitle>
            <DialogDescription>
              Learners you add are assigned to this facilitator. Removing a learner revokes access unless they're in
              another of this facilitator's cohorts.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-3">
            <label className="block text-[13px] font-bold text-[#13215A]">
              Cohort name
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#E4E9F2] px-3 text-[14px] focus:border-[#1C5AD6] focus:outline-none focus:ring-2 focus:ring-[#1C5AD6]/20"
              />
            </label>
            <label className="block text-[13px] font-bold text-[#13215A]">
              Description <span className="font-medium text-[#6B7489]">(optional)</span>
              <input
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[#E4E9F2] px-3 text-[14px] focus:border-[#1C5AD6] focus:outline-none focus:ring-2 focus:ring-[#1C5AD6]/20"
              />
            </label>

            <fieldset>
              <legend className="flex w-full items-center justify-between text-[13px] font-bold text-[#13215A]">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden /> Learners</span>
                <span className="font-semibold text-[#6B7489]">{selected.size} selected</span>
              </legend>
              <label className="relative mt-2 block">
                <span className="sr-only">Search learners</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A8]" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, TATI ID or family"
                  className="h-10 w-full rounded-lg border border-[#E4E9F2] bg-[#F9FAFD] pl-9 pr-3 text-[14px] focus:border-[#1C5AD6] focus:bg-white focus:outline-none"
                />
              </label>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-[#EEF1F6]">
                {isLoading ? (
                  <p className={cn("p-3 text-[13.5px]", t.muted)}>Loading learners…</p>
                ) : filtered.length === 0 ? (
                  <p className={cn("p-3 text-[13.5px]", t.muted)}>No learners match.</p>
                ) : (
                  <ul>
                    {filtered.map((l) => (
                      <li key={l.childId}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[#F9FBFF]">
                          <input
                            type="checkbox"
                            checked={selected.has(l.childId)}
                            onChange={() => toggle(l)}
                            className="h-4 w-4 accent-[#1C5AD6]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-[14px] font-bold", t.navy)}>{l.name}</span>
                            <span className={cn("block truncate text-[12.5px]", t.muted)}>
                              {l.familyName ?? "Family"} · TATI ID {l.tatiId ?? "—"}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </fieldset>

            {save.isError ? (
              <p className="rounded-lg bg-[#FFF6F6] px-3 py-2 text-[13.5px] font-semibold text-[#B42318]" role="alert">
                {save.error instanceof Error && /120/.test(save.error.message)
                  ? "A cohort can have up to 120 learners."
                  : "The cohort couldn't be saved. Please try again."}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={close}
              className={cn("inline-flex h-10 items-center justify-center rounded-lg px-4 text-[14px] font-bold text-[#3D4766] hover:bg-[#F4F6FB]", t.focus)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending || !name.trim()}
              className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white disabled:opacity-60", t.focus)}
            >
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Create cohort"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
