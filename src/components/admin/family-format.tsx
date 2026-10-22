import { cn } from "@/lib/utils";

export function familyDisplayName(f: { name: string | null; parents: { displayName: string | null }[] }) {
  return f.name ?? (f.parents[0]?.displayName ? `${f.parents[0].displayName}'s family` : "Unnamed family");
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold capitalize",
        active ? "bg-[#E3F4EA] text-[#1F7A4C]" : "bg-[#F1F3F8] text-[#5B6478]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-[#22A06B]" : "bg-[#9AA3B5]")} aria-hidden />
      {status}
    </span>
  );
}
