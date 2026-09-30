import avatarSheet from "@/assets/tati-avatars.png.asset.json";
import { cn } from "@/lib/utils";

/** The uploaded artwork is a 3x3 sheet of nine child avatars. */
export const AVATAR_KEYS = [
  "ama",
  "kojo",
  "esi",
  "kwame",
  "yaw",
  "abena",
  "kofi",
  "efua",
  "kwesi",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

const sizes = { sm: 40, md: 56, lg: 88, xl: 120 } as const;

// Fallback colors for avatars when images fail to load
const avatarColors: Record<AvatarKey, string> = {
  ama: "bg-blue-200",
  kojo: "bg-amber-200",
  esi: "bg-pink-200",
  kwame: "bg-green-200",
  yaw: "bg-purple-200",
  abena: "bg-red-200",
  kofi: "bg-cyan-200",
  efua: "bg-orange-200",
  kwesi: "bg-indigo-200",
};

// Emoji representations for avatars as additional fallback
const avatarEmoji: Record<AvatarKey, string> = {
  ama: "👧",
  kojo: "👦",
  esi: "👧",
  kwame: "👨",
  yaw: "👦",
  abena: "👩",
  kofi: "👨",
  efua: "👩",
  kwesi: "👦",
};

export function Avatar({
  avatar = "ama",
  name,
  size = "md",
  ring,
  className,
}: {
  avatar?: AvatarKey | string;
  name?: string;
  size?: keyof typeof sizes;
  ring?: "primary" | "success" | "accent";
  className?: string;
}) {
  const index = Math.max(0, AVATAR_KEYS.indexOf(avatar as AvatarKey));
  const col = index % 3;
  const row = Math.floor(index / 3);
  const px = sizes[size];
  const avatarKey = (avatar as AvatarKey) || "ama";
  const fallbackColor = avatarColors[avatarKey] || "bg-gray-200";

  return (
    <span
      role="img"
      aria-label={name ? `${name}'s avatar` : "Learner avatar"}
      className={cn(
        "inline-block shrink-0 overflow-hidden rounded-full flex items-center justify-center font-bold text-lg",
        fallbackColor,
        ring === "primary" && "ring-4 ring-primary",
        ring === "success" && "ring-4 ring-success",
        ring === "accent" && "ring-4 ring-accent",
        className,
      )}
      style={{
        width: px,
        height: px,
        backgroundImage: `url(${avatarSheet.url})`,
        backgroundSize: "300% 300%",
        backgroundPosition: `${col * 50}% ${row * 50}%`,
        backgroundRepeat: "no-repeat",
        backgroundColor: `var(--fallback-color)`,
      }}
      data-avatar={avatarKey}
    >
      {/* Fallback emoji displayed if image fails */}
      <span className="opacity-0 pointer-events-none">
        {avatarEmoji[avatarKey] || "👤"}
      </span>
    </span>
  );
}
