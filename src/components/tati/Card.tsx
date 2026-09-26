import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tatiTheme } from "@/lib/theme";

export function Card({
  children,
  className,
  tone = "surface",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "muted" | "primary";
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl p-5 shadow-card transition-shadow duration-150 motion-reduce:transition-none",
        interactive && "hover:shadow-lg cursor-pointer",
        tone === "surface" && "bg-card text-card-foreground",
        tone === "muted" && "bg-secondary text-secondary-foreground shadow-none",
        tone === "primary" && "bg-primary text-primary-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-extrabold", className)}>{children}</h2>;
}

export function CardNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-base text-muted-foreground", className)}>{children}</p>;
}
