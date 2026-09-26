import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tatiTheme } from "@/lib/theme";

type Variant = "primary" | "success" | "secondary" | "ghost" | "outline";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  success: "bg-success text-success-foreground hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
  outline: "border-2 border-border bg-card text-foreground hover:border-primary",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
};

const sizes: Record<Size, string> = {
  md: "min-h-[48px] px-5 text-base",
  lg: "min-h-[56px] px-6 text-lg",
};

export type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  /** Renders as a router link when provided. */
  to?: string;
  params?: Record<string, string>;
  className?: string;
  "aria-label"?: string;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  full = true,
  disabled,
  type = "button",
  onClick,
  to,
  params,
  className,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold",
    "transition-[transform,opacity,background-color,border-color,box-shadow] duration-150",
    "active:scale-[0.98] disabled:opacity-50",
    "hover:shadow-lg motion-reduce:hover:shadow-none",
    tatiTheme.focusRing,
    variants[variant],
    sizes[size],
    full && "w-full",
    className,
  );

  if (to) {
    return (
      <Link to={to} {...(params ? { params } : {})} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} {...rest}>
      {children}
    </button>
  );
}
