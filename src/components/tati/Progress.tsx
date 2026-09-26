import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "primary",
  showPercent = false,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "primary" | "success" | "accent";
  showPercent?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          {label ? <span>{label}</span> : <span />}
          {showPercent ? <span className="text-muted-foreground">{pct}%</span> : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-3 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            tone === "primary" && "bg-primary",
            tone === "success" && "bg-success",
            tone === "accent" && "bg-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 96,
  label,
  caption,
  tone = "primary",
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  caption?: string;
  tone?: "primary" | "success" | "accent";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const strokeColor =
    tone === "success" ? "var(--success)" : tone === "accent" ? "var(--accent)" : "var(--primary)";

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          role="img"
          aria-label={`${caption ?? "Progress"}: ${pct}%`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * pct) / 100}
            className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">
          {label ?? `${pct}%`}
        </span>
      </div>
      {caption ? <span className="text-sm font-bold text-muted-foreground">{caption}</span> : null}
    </div>
  );
}
