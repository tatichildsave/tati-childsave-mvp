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
  const fallbackBg = avatarColors[avatarKey] || "bg-gray-200";
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
        imageLoaded ? "bg-secondary" : fallbackBg,
        ring === "primary" && "ring-4 ring-primary",
        ring === "success" && "ring-4 ring-success",
        ring === "accent" && "ring-4 ring-accent",
        className,
      )}
      style={{
        width: px,
        height: px,
        ...(imageLoaded && {
          backgroundImage: `url(${avatarSheet.url})`,
          backgroundSize: "300% 300%",
          backgroundPosition: `${col * 50}% ${row * 50}%`,
          backgroundRepeat: "no-repeat",
        }),
      }}
      data-avatar={avatarKey}
    />
  );
}
