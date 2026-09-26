/**
 * Central TATI design configuration.
 *
 * Colour values themselves live in src/styles.css as CSS variables. This file
 * holds the shared *shape* of the design language — spacing rhythm, radii,
 * typography scale and the semantic tone names used by components — so every
 * screen stays consistent.
 *
 * H2.0 Phase 1: Enhanced with motion tokens, focus styles, and role-specific layouts.
 */

export const tatiTheme = {
  /** Page container: mobile-first, comfortable on tablets, capped on desktop. */
  container: "mx-auto w-full max-w-md px-4 sm:max-w-xl lg:max-w-3xl",
  /** Vertical rhythm between stacked sections. */
  sectionGap: "space-y-4",
  radius: {
    card: "rounded-3xl",
    control: "rounded-2xl",
    pill: "rounded-full",
  },
  /** Accessibility: every tappable target is at least 48x48px. */
  tapTarget: "min-h-[48px] min-w-[48px]",
  text: {
    pageTitle: "text-[28px] leading-tight font-extrabold",
    sectionTitle: "text-lg font-extrabold",
    body: "text-base leading-relaxed",
    muted: "text-base text-muted-foreground",
    caption: "text-sm text-muted-foreground",
  },
  /** Motion tokens for consistent animations */
  motion: {
    fast: "duration-150",
    medium: "duration-300",
    slow: "duration-500",
    easing: "ease-out",
  },
  /** Focus indicator: high-contrast ring for keyboard navigation */
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  /** Button active state: subtle scale-down for tactile feedback */
  buttonActive: "active:scale-[0.98] transition-transform duration-150",
  /** Card hover state: subtle lift animation */
  cardHover: "hover:shadow-lg transition-shadow duration-150 motion-reduce:hover:shadow-card",
} as const;

/** Container sizes for different experiences */
export const containers = {
  junior: "mx-auto w-full max-w-md px-4 sm:max-w-xl lg:max-w-3xl",
  parent: "mx-auto w-full max-w-md px-4 sm:max-w-xl lg:max-w-2xl",
  academy: "mx-auto w-full px-4 sm:px-6 lg:px-8",
  admin: "mx-auto w-full px-4 sm:px-6 lg:px-8",
} as const;

/** Semantic tones shared by Badge, StatCard, Avatar rings and pills. */
export type Tone = "primary" | "success" | "warning" | "neutral" | "danger";

export const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-accent-foreground",
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
};

export const toneSolid: Record<Tone, string> = {
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-accent text-accent-foreground",
  neutral: "bg-secondary text-secondary-foreground",
  danger: "bg-destructive text-destructive-foreground",
};
