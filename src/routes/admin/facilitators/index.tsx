/**
 * Admin — Facilitators directory and account provisioning.
 * Uses admin-only server functions; facilitator accounts can only be created here.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, UserCheck } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { formatDate, StatusBadge } from "@/components/admin/family-format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listFacilitatorsAdmin, provisionFacilitator } from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/facilitators/")({
  head: () => ({ meta: [{ title: "Facilitators — TATI ChildSave admin" }] }),
  component: FacilitatorsPage,
});

const inputClass =
  "h-10 w-full rounded-lg border border-[#E4E9F2] bg-white px-3 text-[14px] text-[#13215A] focus:border-[#1C5AD6] focus:outline-none focus:ring-2 focus:ring-[#1C5AD6]/20";

function FacilitatorsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "facilitators"],
    queryFn: () => listFacilitatorsAdmin(),
    staleTime: 30_000,
  });
  const [open, setOpen] = useState(false);
  const facilitators = data ?? [];

  return (
    <AdminWorkspace title="Facilitators" active="facilitators">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn("text-[26px] font-extrabold leading-tight sm:text-[30px]", t.navy)}>Facilitators</h1>
          <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
            Create facilitator accounts and assign learners to them through cohorts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white shadow-[0_2px_6px_rgba(28,90,214,0.22)] hover:bg-[#174DBA]",
            t.focus,
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden /> Add Facilitator
        </button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className={cn("h-40 animate-pulse", t.card)} aria-busy="true" aria-label="Loading facilitators" />
        ) : isError ? (
          <div className={cn("p-6", t.card)} role="alert">
            <p className="text-[15px] font-extrabold text-[#B42318]">We couldn't load facilitators.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn("mt-3 rounded-lg bg-white px-3 py-1.5 text-[14px] font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4]", t.focus)}
            >
              Try again
            </button>
          </div>
        ) : facilitators.length === 0 ? (
          <div className={cn("px-6 py-12 text-center", t.card)}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9F1FE] text-[#1C5AD6]">
              <UserCheck className="h-6 w-6" aria-hidden />
            </span>
            <p className={cn("mt-3 text-[16px] font-extrabold", t.navy)}>No facilitators yet</p>
            <p className={cn("mx-auto mt-1 max-w-md text-[14px]", t.muted)}>
              Add a facilitator, then create a cohort for them to give them access to their learners.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {facilitators.map((f) => (
              <li key={f.uid}>
                <Link
                  to="/admin/facilitators/$facilitatorUid"
                  params={{ facilitatorUid: f.uid }}
                  className={cn("flex items-center gap-3 p-4 hover:border-[#C9D5EC]", t.card, t.focus)}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E3ECFC] text-[14px] font-extrabold text-[#1C5AD6]">
                    {(f.displayName ?? f.email ?? "F").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-[15px] font-extrabold", t.navy)}>{f.displayName ?? f.email}</span>
                      <StatusBadge status={f.status} />
                    </span>
                    <span className={cn("block truncate text-[13px]", t.muted)}>{f.email}</span>
                    <span className="mt-0.5 block text-[12.5px] text-[#3D4766]">
                      {f.cohortCount} {f.cohortCount === 1 ? "cohort" : "cohorts"} · {f.learnerCount}{" "}
                      {f.learnerCount === 1 ? "learner" : "learners"} · Added {formatDate(f.createdAt)}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#1C5AD6]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddFacilitatorDialog open={open} onOpenChange={setOpen} />
    </AdminWorkspace>
  );
}

function AddFacilitatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ displayName: "", email: "", phone: "" });
  const create = useMutation({
    mutationFn: () =>
      provisionFacilitator({
        data: {
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "facilitators"] }),
  });

  function close(next: boolean) {
    if (!next) {
      setForm({ displayName: "", email: "", phone: "" });
      create.reset();
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {create.isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Facilitator account created</DialogTitle>
              <DialogDescription>{create.data.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Link
                to="/admin/facilitators/$facilitatorUid"
                params={{ facilitatorUid: create.data.facilitatorUid }}
                className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white", t.focus)}
              >
                Assign learners
              </Link>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add a facilitator</DialogTitle>
              <DialogDescription>
                Creates a TATI Academy login with the facilitator role. They set their own password with "Forgot
                password" on the Academy sign-in page.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              <label className="block text-[13px] font-bold text-[#13215A]">
                Full name
                <input
                  required
                  maxLength={100}
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  className={cn(inputClass, "mt-1")}
                  autoComplete="name"
                />
              </label>
              <label className="block text-[13px] font-bold text-[#13215A]">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={cn(inputClass, "mt-1")}
                  autoComplete="email"
                />
              </label>
              <label className="block text-[13px] font-bold text-[#13215A]">
                Phone <span className="font-medium text-[#6B7489]">(optional)</span>
                <input
                  type="tel"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={cn(inputClass, "mt-1")}
                  autoComplete="tel"
                />
              </label>
              {create.isError ? (
                <p className="rounded-lg bg-[#FFF6F6] px-3 py-2 text-[13.5px] font-semibold text-[#B42318]" role="alert">
                  {create.error instanceof Error && /already in use/i.test(create.error.message)
                    ? "An account with this email already exists."
                    : "The account couldn't be created. Please check the details and try again."}
                </p>
              ) : null}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className={cn("inline-flex h-10 items-center justify-center rounded-lg px-4 text-[14px] font-bold text-[#3D4766] hover:bg-[#F4F6FB]", t.focus)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white disabled:opacity-60", t.focus)}
              >
                {create.isPending ? "Creating…" : "Create account"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
