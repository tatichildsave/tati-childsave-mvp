import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/tati-logo.png";
import { Button } from "@/components/tati";
import { LoginLayout } from "./shared/LoginLayout";
import { cn } from "@/lib/utils";

type FacilitatorLoginRedesignProps = {
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function FacilitatorLoginRedesign({
  email,
  password,
  busy,
  error,
  onSubmit,
  onEmailChange,
  onPasswordChange,
}: FacilitatorLoginRedesignProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <LoginLayout
      visualClassName="bg-gradient-to-b from-[#8071ee] via-[#6b5dd9] to-[#4a3fb8] relative overflow-hidden"
      visual={<FacilitatorVisual />}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-xl">📚</span>
            <span className="text-xs font-bold tracking-wider text-[#5330a3] uppercase">
              Your Teaching Workspace
            </span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight">Welcome, Facilitator</h1>
          <p className="mt-4 text-base text-blue-100">
            Guide your learners through their TATI journey. Sign in to your teaching workspace.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={onSubmit}>
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-bold text-white uppercase tracking-wide"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="facilitator@school.edu"
              className={cn(
                "w-full min-h-[56px] rounded-2xl border-2 px-4 text-base font-bold",
                "bg-white/95 border-white/30 text-[#5330a3] placeholder-gray-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8071ee] focus-visible:ring-offset-2 focus-visible:ring-offset-[#7860dd]",
              )}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-bold text-white uppercase tracking-wide"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="text-sm font-bold text-white/90 hover:text-white transition-colors"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
              >
                {passwordVisible ? (
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
              id="password"
              type={passwordVisible ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className={cn(
                "w-full min-h-[56px] rounded-2xl border-2 px-4 text-base font-bold",
                "bg-white/95 border-white/30 text-[#5330a3] placeholder-gray-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8071ee] focus-visible:ring-offset-2 focus-visible:ring-offset-[#7860dd]",
              )}
              aria-describedby={error ? "login-error" : undefined}
            />
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
            disabled={busy || !email || !password}
            className={cn(
              "w-full min-h-[56px] rounded-full text-lg font-extrabold",
              "bg-gradient-to-r from-[#8071ee] to-[#6b5dd9] text-white",
              "hover:shadow-lg hover:from-[#8f7ff7] hover:to-[#7566e1]",
              "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-lg shadow-[#8071ee]/40 transition-all",
            )}
          >
            {busy ? "Signing you in…" : "Enter TATI Academy →"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 space-y-4">
          <div className="text-center">
            <Link
              to="/academy/forgot-password"
              className="text-sm font-bold text-white/80 hover:text-white transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
          <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 border border-white/20">
            <p className="text-xs font-bold text-blue-100">
              🏫 <span className="font-extrabold text-white">Don't have an account?</span> Contact
              your administrator for access to TATI Academy.
            </p>
          </div>
          <div className="text-center text-sm text-blue-100">
            Not a facilitator?{" "}
            <Link
              to="/login"
              className="font-extrabold text-white hover:text-blue-100 transition-colors"
            >
              Go back
            </Link>
          </div>
        </div>
      </div>
    </LoginLayout>
  );
}

/**
 * Facilitator login visual: educational, learning-board focused
 */
function FacilitatorVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-white blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full bg-white/50 blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-sm">
        {/* Main learning board visual */}
        <div className="mb-8">
          <div className="bg-gradient-to-b from-white/20 to-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-white/30 shadow-2xl">
            {/* Chalk board style header */}
            <div className="mb-6">
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">
                Enter TATI Academy
              </p>
              <h3 className="text-white font-black text-2xl mb-4">Your Teaching Workspace</h3>
            </div>

            {/* Learning topics grid */}
            <div className="space-y-3">
              {/* Topic 1 */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📚</div>
                  <div className="text-left">
                    <p className="text-white font-extrabold text-sm">Needs vs Wants</p>
                    <p className="text-white/60 text-xs">Smart money decisions</p>
                  </div>
                </div>
              </div>

              {/* Topic 2 */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💰</div>
                  <div className="text-left">
                    <p className="text-white font-extrabold text-sm">Smart Saving</p>
                    <p className="text-white/60 text-xs">Build financial habits</p>
                  </div>
                </div>
              </div>

              {/* Topic 3 */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🎯</div>
                  <div className="text-left">
                    <p className="text-white font-extrabold text-sm">Goal Setting</p>
                    <p className="text-white/60 text-xs">Dream big, save smart</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button copy */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-white/90 font-bold text-sm">Ready to guide your learners?</p>
              <p className="text-white/60 text-xs mt-2">
                Access your complete teaching resources after sign-in
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
