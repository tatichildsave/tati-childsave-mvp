/**
 * Parent Dashboard V2 palette, sampled from the approved reference design.
 * Kept as Tailwind arbitrary-value class fragments so the parent workspace can
 * match the reference without changing the global theme used by other roles.
 */
export const parentTheme = {
  pageBg: "bg-[#F4F6FB]",
  navy: "text-[#13215A]",
  blue: "text-[#1C5AD6]",
  muted: "text-[#6B7489]",
  card: "bg-white rounded-2xl border border-[#E4E9F2] shadow-[0_1px_2px_rgba(16,24,64,0.04),0_4px_14px_rgba(16,24,64,0.04)]",
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C5AD6] focus-visible:ring-offset-2",
} as const;
