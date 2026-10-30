/**
 * The four sign-in entrances. Every `to` is an existing authentication route:
 * - Learner:     /child/login   (TATI ID + 4-digit PIN)
 * - Parent:      /login         (admin-provisioned parent accounts, no self-registration)
 * - Facilitator: /academy/login
 * - Admin:       /admin-login
 */
export type WelcomeRoleId = "learner" | "parent" | "facilitator" | "admin";

export type WelcomeRolePath = "/child/login" | "/login" | "/academy/login" | "/admin-login";

export interface WelcomeRole {
  id: WelcomeRoleId;
  to: WelcomeRolePath;
  title: string;
  description: string;
  cta: string;
  emoji: string;
  /** Short label used by the quick-access chips. */
  chip: string;
  tint: string;
}

export const WELCOME_ROLES: readonly WelcomeRole[] = [
  {
    id: "learner",
    to: "/child/login",
    title: "Learner sign in",
    description: "Let's make money moves!",
    cta: "Start learning",
    emoji: "🚀",
    chip: "Learner",
    tint: "bg-adventure-tint-green",
  },
  {
    id: "parent",
    to: "/login",
    title: "Parent sign in",
    description: "Follow your child's progress.",
    cta: "Enter family space",
    emoji: "💙",
    chip: "Parent",
    tint: "bg-adventure-tint-blue",
  },
  {
    id: "facilitator",
    to: "/academy/login",
    title: "Facilitator sign in",
    description: "Your teaching workspace.",
    cta: "Sign in",
    emoji: "📚",
    chip: "Facilitator",
    tint: "bg-adventure-tint-amber",
  },
  {
    id: "admin",
    to: "/admin-login",
    title: "Admin sign in",
    description: "Manage the TATI platform.",
    cta: "Sign in",
    emoji: "🛡️",
    chip: "Admin",
    tint: "bg-adventure-tint-violet",
  },
];

export function getWelcomeRole(id: WelcomeRoleId): WelcomeRole {
  const role = WELCOME_ROLES.find((item) => item.id === id);
  if (!role) throw new Error(`Unknown welcome role: ${id}`);
  return role;
}

export const WELCOME_SPEECH =
  "Welcome to TATI ChildSave! Money skills are your new superpower. Save for your dreams, take on fun money missions, and earn badges. Choose your entrance to sign in as a learner, parent, facilitator or admin.";
