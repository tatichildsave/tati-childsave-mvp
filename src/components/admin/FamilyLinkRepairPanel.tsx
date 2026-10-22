import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, Wrench } from "lucide-react";
import { repairFamilyLinks, type FamilyLinkRepairReport } from "@/lib/backend/provisioning.functions";
import { parentTheme as t } from "@/components/parent/theme";
import { cn } from "@/lib/utils";

function pendingCount(r: FamilyLinkRepairReport) {
  return r.linksToAdd.length + r.childFieldsToFix + r.strayFamiliesToRetire.length;
}

/**
 * One-off maintenance: makes sure every enrolled parent can see their family in the
 * parent portal. Always previews first; applying is additive and never deletes data.
 */
export function FamilyLinkRepairPanel() {
  const qc = useQueryClient();
  const check = useMutation({ mutationFn: () => repairFamilyLinks({ data: { apply: false } }) });
  const apply = useMutation({
    mutationFn: () => repairFamilyLinks({ data: { apply: true } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      check.reset();
    },
  });

  const report = check.data;
  const applied = apply.data;

  return (
    <section className={cn("mt-6 p-5", t.card)} aria-labelledby="link-check-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[min(100%,320px)] flex-1">
          <h2 id="link-check-title" className={cn("flex items-center gap-2 text-[16px] font-extrabold", t.navy)}>
            <Link2 className="h-5 w-5 text-[#1C5AD6]" aria-hidden /> Parent portal link check
          </h2>
          <p className={cn("mt-1 text-[13.5px] leading-snug", t.muted)}>
            Makes sure every enrolled parent sees their family and children in the parent portal. Families enrolled
            before 22 Oct 2026 may need this once. Nothing is deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            apply.reset();
            check.mutate();
          }}
          disabled={check.isPending || apply.isPending}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border border-[#D7E1F4] bg-white px-3.5 text-[13px] font-bold text-[#1C5AD6] hover:bg-[#F4F8FF] disabled:opacity-60",
            t.focus,
          )}
        >
          {check.isPending ? "Checking…" : "Check links"}
        </button>
      </div>

      <div aria-live="polite">
        {check.isError || apply.isError ? (
          <p className="mt-4 rounded-lg bg-[#FFF6F6] px-3 py-2 text-[13.5px] font-semibold text-[#B42318]" role="alert">
            The check couldn't be completed. Please try again.
          </p>
        ) : null}

        {applied ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-[#EEF9F2] px-3 py-2 text-[13.5px] font-semibold text-[#1F7A4C]">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Repair applied: {applied.linksToAdd.length} parent links added, {applied.childFieldsToFix} child records
            updated, {applied.strayFamiliesToRetire.length} empty auto-created families retired.
          </p>
        ) : null}

        {report ? (
          <div className="mt-4 space-y-3 text-[13.5px] text-[#3D4766]">
            <p>
              Scanned <strong>{report.familiesScanned}</strong> families.
            </p>
            <ul className="grid gap-2 sm:grid-cols-3">
              <li className="rounded-lg bg-[#F9FAFD] px-3 py-2">
                <span className={cn("block text-[20px] font-extrabold", t.navy)}>{report.linksToAdd.length}</span>
                parent links missing
              </li>
              <li className="rounded-lg bg-[#F9FAFD] px-3 py-2">
                <span className={cn("block text-[20px] font-extrabold", t.navy)}>{report.childFieldsToFix}</span>
                child records missing portal fields
              </li>
              <li className="rounded-lg bg-[#F9FAFD] px-3 py-2">
                <span className={cn("block text-[20px] font-extrabold", t.navy)}>{report.strayFamiliesToRetire.length}</span>
                empty auto-created families
              </li>
            </ul>

            {report.linksToAdd.length > 0 ? (
              <details className="rounded-lg border border-[#EEF1F6] px-3 py-2">
                <summary className="cursor-pointer font-bold text-[#13215A]">Parents to re-link</summary>
                <ul className="mt-2 space-y-1">
                  {report.linksToAdd.map((l) => (
                    <li key={`${l.familyId}-${l.parentUid}`}>
                      {l.parentEmail ?? l.parentUid} → {l.familyName ?? l.familyId}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {report.needsReview.length > 0 ? (
              <p className="rounded-lg bg-[#FFF8E6] px-3 py-2 text-[#8A5A00]">
                <strong>{report.needsReview.length}</strong> parent(s) also have a self-created family that contains
                children ({report.needsReview.map((r) => r.parentEmail ?? r.parentUid).join(", ")}). These are left
                unchanged for manual review.
              </p>
            ) : null}

            {pendingCount(report) === 0 ? (
              <p className="flex items-center gap-2 font-semibold text-[#1F7A4C]">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> All parent links are correct. Nothing to repair.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => apply.mutate()}
                disabled={apply.isPending}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg bg-[#1C5AD6] px-4 text-[14px] font-bold text-white hover:bg-[#174DBA] disabled:opacity-60",
                  t.focus,
                )}
              >
                <Wrench className="h-4 w-4" aria-hidden />
                {apply.isPending ? "Applying…" : `Apply repair (${pendingCount(report)} changes)`}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
