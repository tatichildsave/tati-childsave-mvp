import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/tati-logo.png";
import { Button } from "@/components/tati";
import { LoginLayout } from "./shared/LoginLayout";
import { cn } from "@/lib/utils";

type LearnerLoginRedesignProps = {
  tatiId: string;
  pin: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent) => void;
  onTatiIdChange: (value: string) => void;
  onPinChange: (value: string) => void;
};

export function LearnerLoginRedesign({
  tatiId,
  pin,
  busy,
  error,
  onSubmit,
  onTatiIdChange,
  onPinChange,
}: LearnerLoginRedesignProps) {
  const [pinVisible, setPinVisible] = useState(false);

  return (
    <LoginLayout
      visualClassName="bg-gradient-to-b from-[#1749c7] via-[#164acb] to-[#0e1f5c] relative overflow-hidden"
      visual={<LearnerVisual />}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-xl">✦</span>
            <span className="text-xs font-bold tracking-wider text-[#1749c7] uppercase">
              Welcome to the TATI Adventure
            </span>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight">
            Money skills are your new <span className="text-[#ffdc48]">SUPERPOWER!</span>
          </h1>
          <p className="mt-4 text-base text-blue-100">
            Let's make money moves together. Enter your TATI ID and 4-digit PIN to get started.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={onSubmit}>
          {/* TATI ID Field */}
          <div>
            <label
              htmlFor="tati-id"
              className="mb-2 block text-sm font-bold text-white uppercase tracking-wide"
            >
              Your TATI ID
            </label>
            <input
              id="tati-id"
              type="text"
              required
              autoCapitalize="characters"
              autoComplete="username"
              value={tatiId}
              onChange={(e) => onTatiIdChange(e.target.value)}
              placeholder="TATI-XXXXXXXX"
              className={cn(
                "w-full min-h-[56px] rounded-2xl border-2 px-4 text-base font-bold uppercase",
                "bg-white/95 border-white/30 text-[#0e1f5c] placeholder-gray-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc48] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1749c7]",
              )}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          {/* PIN Field */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="child-pin"
                className="text-sm font-bold text-white uppercase tracking-wide"
              >
                Your 4-digit PIN
              </label>
              <button
                type="button"
                onClick={() => setPinVisible(!pinVisible)}
                className="text-sm font-bold text-white/90 hover:text-white transition-colors"
                aria-label={pinVisible ? "Hide PIN" : "Show PIN"}
              >
                {pinVisible ? (
                  <>
                    <EyeOff className="inline h-4 w-4 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="inline h-4 w-4 mr-1" />
                    Show
                  </>
                )}
              </button>
            </div>
            <input
              id="child-pin"
              type={pinVisible ? "text" : "password"}
              required
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => onPinChange(e.target.value)}
              className={cn(
                "w-full min-h-[56px] rounded-2xl border-2 px-4 text-center text-2xl font-extrabold tracking-widest",
                "bg-white/95 border-white/30 text-[#0e1f5c]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc48] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1749c7]",
              )}
              aria-describedby={error ? "login-error" : undefined}
            />
            <p className="mt-2 text-xs text-blue-100 text-center">
              {pin.length} of 4 digits entered
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              id="login-error"
              role="alert"
              className="flex gap-3 rounded-2xl border-2 border-[#ff6b6b] bg-[#ffe0e0] p-4 text-sm font-bold text-[#c92a2a]"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={busy || !tatiId || pin.length !== 4}
            className={cn(
              "w-full min-h-[56px] rounded-full text-lg font-extrabold",
              "bg-gradient-to-r from-[#ffdc48] to-[#fca92b] text-[#1b3a92]",
              "hover:shadow-lg hover:from-[#ffe058] hover:to-[#fdad33]",
              "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-lg shadow-[#ffdc48]/40 transition-all",
            )}
          >
            {busy ? "Checking…" : "🚀 Start my adventure"}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 space-y-3">
          <div className="text-center">
            <Link
              to="/child/test-login"
              className="text-sm font-bold text-white/80 hover:text-white transition-colors"
            >
              Try demo login
            </Link>
          </div>
          <div className="text-center text-sm text-blue-100">
            Parent or guardian?{" "}
            <Link
              to="/login"
              className="font-extrabold text-white hover:text-[#ffdc48] transition-colors"
            >
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </LoginLayout>
  );
}

/**
 * Learner login visual: bright, playful, money-themed with achievement badges
 */
function LearnerVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Floating achievement badge - top right */}
      <div
        className="absolute top-8 right-8 rounded-2xl bg-white shadow-xl p-4 max-w-[160px] z-20"
        style={{
          animation: "float 4s ease-in-out infinite",
          transformOrigin: "center",
        }}
      >
        <div className="text-3xl mb-2">🏆</div>
        <p className="text-xs font-extrabold text-[#1749c7] uppercase tracking-wider">
          Achievement Unlocked
        </p>
        <p className="text-sm font-bold text-[#1749c7]">Money Explorer</p>
      </div>

      {/* Floating coins with orbits */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        style={{ filter: "drop-shadow(0 0 30px rgba(255, 220, 72, 0.1))" }}
      >
        {/* Orbit paths */}
        <circle
          cx="200"
          cy="250"
          r="120"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <circle
          cx="200"
          cy="250"
          r="80"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
          strokeDasharray="4 2"
          opacity="0.3"
        />

        {/* Decorative sparkles */}
        <text x="80" y="120" fontSize="28" opacity="0.8">
          ✳️
        </text>
        <text
          x="320"
          y="140"
          fontSize="32"
          opacity="0.9"
          style={{ animation: "twinkle 3s ease-in-out infinite" }}
        >
          ✨
        </text>
        <text x="60" y="380" fontSize="26" opacity="0.7">
          ⭐
        </text>
      </svg>

      {/* Large coin - center right */}
      <div
        className="absolute w-24 h-24 rounded-full bg-gradient-to-b from-[#fff2a6] to-[#fca92b] border-4 border-yellow-100 flex items-center justify-center font-extrabold text-4xl shadow-2xl z-10"
        style={{
          top: "20%",
          right: "12%",
          animation: "float 4s ease-in-out infinite",
          boxShadow:
            "inset -3px -3px 0 rgba(139, 107, 30, 0.4), 0 12px 24px rgba(15, 23, 42, 0.4), 0 0 20px rgba(255, 220, 72, 0.3)",
        }}
      >
        💰
      </div>

      {/* Small coin - bottom left */}
      <div
        className="absolute w-14 h-14 rounded-full bg-gradient-to-b from-[#fff2a6] to-[#fca92b] border-2 border-yellow-100 flex items-center justify-center font-bold text-xl shadow-lg z-10"
        style={{
          bottom: "25%",
          left: "10%",
          animation: "float 5s ease-in-out infinite reverse",
          boxShadow:
            "inset -2px -2px 0 rgba(139, 107, 30, 0.3), 0 6px 12px rgba(15, 23, 42, 0.3), 0 0 12px rgba(255, 220, 72, 0.2)",
        }}
      >
        ₵
      </div>

      {/* Level up badge - bottom center */}
      <div
        className="absolute bottom-12 rounded-full bg-gradient-to-r from-[#ff81a5] to-[#ff6b9d] text-white px-5 py-3 font-extrabold text-sm shadow-lg z-20"
        style={{
          animation: "pulse 2s ease-in-out infinite",
          boxShadow: "0 8px 20px rgba(255, 107, 157, 0.4)",
        }}
      >
        ⭐ <span className="ml-2">Level 01</span>
      </div>

      {/* Center message badge */}
      <div className="relative z-30 text-center">
        <div className="inline-block rounded-full bg-white px-6 py-4 shadow-2xl">
          <p className="text-xs font-extrabold text-[#1749c7] uppercase tracking-wider">
            ✦ LET'S LEVEL UP!
          </p>
          <p className="text-sm font-bold text-gray-700 mt-2">You're on your way!</p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-24px) rotate(2deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.05) translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
