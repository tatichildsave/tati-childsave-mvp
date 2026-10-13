import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SaveFeedbackProps {
  status: "idle" | "saving" | "saved" | "error";
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Displays save status feedback to the child: "Saving...", "Saved", or error with retry.
 * Auto-hides "Saved" message after 2 seconds.
 */
export function SaveFeedback({ status, error, onRetry }: SaveFeedbackProps) {
  const [autoHide, setAutoHide] = useState(false);

  useEffect(() => {
    if (status === "saved") {
      const timer = setTimeout(() => setAutoHide(true), 2000);
      return () => clearTimeout(timer);
    }
    setAutoHide(false);
  }, [status]);

  if (status === "idle" || autoHide) {
    return null;
  }

  if (status === "saving") {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 max-w-sm rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg animate-pulse"
        role="status"
        aria-live="polite"
      >
        ⏳ Saving your progress...
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 max-w-sm rounded-2xl bg-success px-4 py-3 text-sm font-bold text-success-foreground shadow-lg"
        role="status"
        aria-live="polite"
      >
        ✓ Progress saved
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fixed bottom-4 left-4 right-4 max-w-sm rounded-2xl bg-warning px-4 py-3 shadow-lg">
        <p className="text-sm font-bold text-warning-foreground">{error || "Could not save"}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-warning-foreground px-3 text-sm font-bold text-warning hover:opacity-90 transition-opacity"
            aria-label="Try saving again"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return null;
}
