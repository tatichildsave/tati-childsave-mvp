import type { ReactNode } from "react";

/**
 * The one big celebration. Reserved for a major milestone such as finishing the
 * whole journey — never used after everyday steps.
 */
export function CelebrationOverlay({
  title,
  message,
  badgeIcons = [],
  xp,
  primaryLabel,
  onPrimary,
  secondary,
}: {
  title: string;
  message: string;
  badgeIcons?: string[];
  xp?: number;
  primaryLabel: string;
  onPrimary: () => void;
  secondary?: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 px-4 backdrop-blur-sm"
    >
      <div className="tati-milestone-in w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-lg">
        <span aria-hidden="true" className="text-5xl">
          🎉
        </span>
        <h2 className="mt-3 text-2xl font-extrabold">{title}</h2>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{message}</p>

        {badgeIcons.length > 0 ? (
          <div className="mt-4 flex justify-center gap-2 text-3xl" aria-hidden="true">
            {badgeIcons.map((icon, i) => (
              <span
                key={`${icon}-${i}`}
                className="inline-block tati-badge-unlock"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {icon}
              </span>
            ))}
          </div>
        ) : null}

        {xp != null ? (
          <p className="mt-4 inline-block rounded-full bg-accent-soft px-4 py-2 text-sm font-extrabold text-accent-foreground">
            +{xp} XP earned
          </p>
        ) : null}

        <button
          type="button"
          onClick={onPrimary}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-primary px-6 text-base font-extrabold text-primary-foreground"
        >
          {primaryLabel}
        </button>
        {secondary ? <div className="mt-3">{secondary}</div> : null}
      </div>
    </div>
  );
}
