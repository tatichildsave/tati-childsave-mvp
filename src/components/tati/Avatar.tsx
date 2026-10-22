import { useEffect, useRef, useState } from "react";
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

/**
 * The artwork (1024×572) is a 4×2 sheet: full-body figures on the top row and
 * matching head-and-shoulders portraits on the bottom row. Avatars use the
 * portraits. Nine stored keys map onto the four portraits.
 */
const SHEET = { width: 1024, height: 572, crop: 168, centerY: 486 } as const;
const PORTRAIT_CENTERS_X = [160, 400, 642, 878] as const;
const PORTRAIT_FOR_KEY: Record<AvatarKey, number> = {
  ama: 0,
  kojo: 1,
  esi: 2,
  kwame: 3,
  yaw: 1,
  abena: 0,
  kofi: 3,
  efua: 2,
  kwesi: 1,
};

// Fallback RGB colors for avatars when images fail to load
const avatarColors: Record<AvatarKey, string> = {
  ama: "rgb(191, 219, 254)", // bg-blue-200
  kojo: "rgb(253, 230, 138)", // bg-amber-200
  esi: "rgb(252, 231, 243)", // bg-pink-200
  kwame: "rgb(187, 247, 208)", // bg-green-200
  yaw: "rgb(243, 232, 255)", // bg-purple-200
  abena: "rgb(254, 226, 226)", // bg-red-200
  kofi: "rgb(207, 250, 254)", // bg-cyan-200
  efua: "rgb(254, 237, 210)", // bg-orange-200
  kwesi: "rgb(224, 231, 255)", // bg-indigo-200
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
  /** Preset size or an exact pixel size. */
  size?: keyof typeof sizes | number;
  ring?: "primary" | "success" | "accent";
  className?: string;
}) {
  const known = (AVATAR_KEYS as readonly string[]).includes(avatar);
  const avatarKey = (known ? avatar : "ama") as AvatarKey;
  const px = typeof size === "number" ? size : sizes[size];
  const scale = px / SHEET.crop;
  const cx = PORTRAIT_CENTERS_X[PORTRAIT_FOR_KEY[avatarKey]] ?? PORTRAIT_CENTERS_X[0];
  const fallbackColor = avatarColors[avatarKey] || "rgb(229, 231, 235)"; // bg-gray-200
  const spanRef = useRef<HTMLSpanElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Check if image loads, otherwise show fallback
  useEffect(() => {
    if (!spanRef.current || imageLoaded) return;

    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(false);
    img.src = avatarSheet.url;
  }, [imageLoaded]);

  return (
    <span
      ref={spanRef}
      role="img"
      aria-label={name ? `${name}'s avatar` : "Learner avatar"}
      className={cn(
        "inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full font-bold text-lg",
        ring === "primary" && "ring-4 ring-primary",
        ring === "success" && "ring-4 ring-success",
        ring === "accent" && "ring-4 ring-accent",
        className,
      )}
      style={{
        width: px,
        height: px,
        backgroundColor: imageLoaded ? "rgb(236, 230, 218)" : fallbackColor,
        backgroundImage: imageLoaded ? `url(${avatarSheet.url})` : "none",
        backgroundSize: `${SHEET.width * scale}px ${SHEET.height * scale}px`,
        backgroundPosition: `${-(cx - SHEET.crop / 2) * scale}px ${-(SHEET.centerY - SHEET.crop / 2) * scale}px`,
        backgroundRepeat: "no-repeat",
      }}
      data-avatar={avatarKey}
    />
  );
}
