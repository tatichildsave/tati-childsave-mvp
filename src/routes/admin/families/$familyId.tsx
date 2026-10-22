/**
 * Admin — Family detail.
 * Real data via getFamilyAdmin; PIN resets use the existing admin-only resetChildPin
 * server function. A new PIN is shown once and never stored in the browser.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, KeyRound, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { familyDisplayName, formatDate, StatusBadge } from "@/components/admin/family-format";
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
  getFamilyAdmin,
  resetChildPin,
  type AdminFamilyChild,
} from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/families/$familyId")({
  head: () => ({ meta: [{ title: "Family — TATI ChildSave admin" }] }),
  component: FamilyDetailPage,
});

function FamilyDetailPage() {
  const { familyId } = Route.useParams();
  const { data: family, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "family", familyId],
    queryFn: () => getFamilyAdmin({ data: { familyId } }),
    staleTime: 30_000,
  });
  const [pinChild, setPinChild] = useState<AdminFamilyChild | null>(null);

  return (
    <AdminWorkspace title="Family details" active="families">
      <Link
        to="/admin/families"
        className={cn("inline-flex items-center gap-1.5 rounded-md text-[14px] font-bold text-[#1C5AD6] hover:underline", t.focus)}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All families
      </Link>

      {isLoading ? (
        <div className={cn("mt-4 h-40 animate-pulse", t.card)} aria-busy="true" aria-label="Loading family" />
      ) : isError ? (
        <div className={cn("mt-4 p-6", t.card)} role="alert">
          <p className="text-[15px] font-extrabold text-[#B42318]">We couldn't load this family.</p>
          <p className={cn("mt-1 text-[14px]", t.muted)}>Check your connection or sign in again, then retry.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className={cn("mt-3 rounded-lg bg-white px-3 py-1.5 text-[14px] font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4]", t.focus)}
          >
            Try again
          </button>
        </div>
      ) : !family ? (
        <div className={cn("mt-4 px-6 py-10 text-center", t.card)}>
          <p className={cn("text-[16px] font-extrabold", t.navy)}>Family not found</p>
          <p className={cn("mt-1 text-[14px]", t.muted)}>It may have been removed, or the link is incorrect.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <section className={cn("mt-4 p-5 sm:p-6", t.card)} aria-labelledby="family-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 id="family-title" className={cn("text-[24px] font-extrabold leading-tight sm:text-[28px]", t.navy)}>
                  {familyDisplayName(family)}
                </h1>
                <p className={cn("mt-1 text-[14px] font-medium", t.muted)}>
                  Enrolled {formatDate(family.enrolmentDate ?? family.createdAt)} ·{" "}
                  {family.children.length} {family.children.length === 1 ? "child" : "children"}
                </p>
              </div>
              <StatusBadge status={family.status} />
            </div>
            {family.notes ? (
              <p className="mt-4 rounded-xl bg-[#F4F8FF] px-4 py-3 text-[14px] text-[#3D4766]">
                <span className="font-bold text-[#13215A]">Notes: </span>
                {family.notes}
              </p>
            ) : null}
            <p className="mt-4 text-[12px] text-[#8A93A8]">
              Family ID: <span className="font-mono">{family.id}</span>
            </p>
          </section>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {/* Parents */}
            <section className={cn("p-5", t.card)} aria-labelledby="parents-title">
              <h2 id="parents-title" className={cn("flex items-center gap-2 text-[17px] font-extrabold", t.navy)}>
                <Users className="h-5 w-5 text-[#1C5AD6]" aria-hidden /> Parents & guardians
              </h2>
              {family.parents.length === 0 ? (
                <p className={cn("mt-3 text-[14px]", t.muted)}>No parent account is linked to this family.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {family.parents.map((p) => (
                    <li key={p.uid} className="rounded-xl border border-[#EEF1F6] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-[15px] font-extrabold", t.navy)}>{p.displayName ?? "Parent"}</p>
                        {p.status ? <StatusBadge status={p.status} /> : null}
                      </div>
                      {p.email ? (
                        <p className="mt-1.5 flex items-center gap-2 truncate text-[13.5px] text-[#3D4766]">
                          <Mail className="h-4 w-4 shrink-0 text-[#8A93A8]" aria-hidden /> {p.email}
                        </p>
                      ) : null}
                      {p.phone ? (
                        <p className="mt-1 flex items-center gap-2 text-[13.5px] text-[#3D4766]">
                          <Phone className="h-4 w-4 shrink-0 text-[#8A93A8]" aria-hidden /> {p.phone}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className={cn("mt-4 flex gap-2 text-[12.5px] leading-snug", t.muted)}>
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#22A06B]" aria-hidden />
                Parents have read-only access to their own children's progress. Only administrators can enrol
                families and provision children.
              </p>
            </section>

            {/* Children */}
            <section className={cn("p-5", t.card)} aria-labelledby="children-title">
              <h2 id="children-title" className={cn("text-[17px] font-extrabold", t.navy)}>
                Children
              </h2>
              {family.children.length === 0 ? (
                <p className={cn("mt-3 text-[14px]", t.muted)}>No children have been provisioned for this family yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {family.children.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EEF1F6] p-3.5">
                      <Avatar {...(c.avatar ? { avatar: c.avatar } : {})} name={c.name} size={48} />
                      <div className="min-w-[160px] flex-1">
                        <p className={cn("truncate text-[15px] font-extrabold", t.navy)}>
                          {c.name}
                          {c.preferredName ? <span className="font-semibold text-[#6B7489]"> ({c.preferredName})</span> : null}
                        </p>
                        <p className={cn("mt-0.5 text-[13px]", t.muted)}>
                          {c.age !== null ? `Age ${c.age} · ` : ""}TATI ID{" "}
                          <span className="font-mono font-bold text-[#1C5AD6]">{c.tatiId ?? "not assigned"}</span>
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                      <button
                        type="button"
                        onClick={() => setPinChild(c)}
                        disabled={!c.tatiId}
                        title={c.tatiId ? "Generate a new PIN for this child" : "This child has no TATI ID login"}
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D7E1F4] bg-white px-3 text-[13px] font-bold text-[#1C5AD6] hover:bg-[#F4F8FF] disabled:cursor-not-allowed disabled:opacity-50",
                          t.focus,
                        )}
                      >
                        <KeyRound className="h-4 w-4" aria-hidden /> Reset PIN
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <ResetPinDialog familyId={family.id} child={pinChild} onClose={() => setPinChild(null)} />
        </>
      )}
    </AdminWorkspace>
  );
}

function ResetPinDialog({
  familyId,
  child,
  onClose,
}: {
  familyId: string;
  child: AdminFamilyChild | null;
  onClose: () => void;
}) {
  const [newPin, setNewPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mutation = useMutation({
    mutationFn: (childId: string) => resetChildPin({ data: { childId, familyId } }),
    onSuccess: (result) => setNewPin(result.newPin),
  });

  function close() {
    setNewPin(null);
    setCopied(false);
    mutation.reset();
    onClose();
  }

  async function copy() {
    if (!newPin) return;
    try {
      await navigator.clipboard.writeText(newPin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog open={!!child} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="sm:max-w-md">
        {newPin ? (
          <>
            <DialogHeader>
              <DialogTitle>New PIN for {child?.name}</DialogTitle>
              <DialogDescription>
                This PIN is shown only once. Share it with the child or their parent securely. If it's lost, reset
                it again.
              </DialogDescription>
            </DialogHeader>
            <div className="my-2 rounded-2xl bg-[#F4F8FF] px-4 py-5 text-center">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#6B7489]">TATI ID {child?.tatiId}</p>
              <p className="mt-2 font-mono text-[34px] font-extrabold tracking-[0.3em] text-[#13215A]" aria-live="polite">
                {newPin}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D7E1F4] px-4 text-[14px] font-bold text-[#1C5AD6]", t.focus)}
              >
                <Copy className="h-4 w-4" aria-hidden /> {copied ? "Copied" : "Copy PIN"}
              </button>
              <button
                type="button"
                onClick={close}
                className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white", t.focus)}
              >
                I've recorded it
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reset PIN for {child?.name}?</DialogTitle>
              <DialogDescription>
                A new PIN will be generated and the current PIN will stop working immediately. Their TATI ID stays
                the same.
              </DialogDescription>
            </DialogHeader>
            {mutation.isError ? (
              <p className="rounded-lg bg-[#FFF6F6] px-3 py-2 text-[13.5px] font-semibold text-[#B42318]" role="alert">
                The PIN couldn't be reset. Please try again.
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={close}
                className={cn("inline-flex h-10 items-center justify-center rounded-lg px-4 text-[14px] font-bold text-[#3D4766] hover:bg-[#F4F6FB]", t.focus)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutation.isPending || !child}
                onClick={() => child && mutation.mutate(child.id)}
                className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white disabled:opacity-60", t.focus)}
              >
                {mutation.isPending ? "Resetting…" : "Reset PIN"}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
