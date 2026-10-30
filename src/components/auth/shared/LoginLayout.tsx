import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared two-column login layout with hero visual on left, form on right.
 * On mobile, stacks vertically with visual first.
 */
export function LoginLayout({
  children,
  visual,
  visualClassName,
}: {
  children: ReactNode;
  visual?: ReactNode;
  visualClassName?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 lg:gap-0">
      {/* Visual hero section */}
      {visual && (
        <div
          className={cn(
            "flex items-center justify-center p-4 py-12 lg:py-0 lg:p-8",
            visualClassName,
          )}
        >
          {visual}
        </div>
      )}

      {/* Form section */}
      <div className="flex flex-col items-center justify-center p-4 py-12 lg:py-0 lg:p-8">
        {children}
      </div>
    </div>
  );
}
