import type { FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/tati-logo.png";
import { Button } from "@/components/tati";
import { LoginLayout } from "./shared/LoginLayout";
import { cn } from "@/lib/utils";

type ParentLoginRedesignProps = {
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onGoogleClick?: () => void;
  googleBusy?: boolean;
};

export function ParentLoginRedesign({
  email,
  password,
  busy,
  error,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onGoogleClick,
  googleBusy = false,
}: ParentLoginRedesignProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <LoginLayout
      visualClassName="bg-gradient-to-b from-[#70ebc0] via-[#5dd4b1] to-[#3d9f8f] relative overflow-hidden"
      visual={<ParentVisual />}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-xl">💙</span>
            <span className="text-xs font-bold tracking-wider text-[#0d6b52] uppercase">
              Support Your Child
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#0d6b52] leading-tight">Welcome back</h1>
          <p className="mt-4 text-base text-[#2d7d6a]">
            Follow your child's progress. Sign in to your family space and celebrate milestones
            together.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={onSubmit}>
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-bold text-[#0d6b52] uppercase tracking-wide"
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
              placeholder="parent@example.com"
              className={cn(
                "w-full min-h-[56px] rounded-2xl border-2 px-4 text-base font-bold",
                "bg-white/95 border-white/30 text-[#0d6b52] placeholder-gray-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d6a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#70ebc0]",
              )}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-bold text-[#0d6b52] uppercase tracking-wide"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="text-sm font-bold text-[#2d7d6a] hover:text-[#0d6b52] transition-colors"
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
                "bg-white/95 border-white/30 text-[#0d6b52] placeholder-gray-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d7d6a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#70ebc0]",
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
              "bg-gradient-to-r from-[#2d7d6a] to-[#0d6b52] text-white",
              "hover:shadow-lg hover:from-[#386e5e] hover:to-[#1a5e4d]",
              "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-lg shadow-[#2d7d6a]/40 transition-all",
            )}
          >
            {busy ? "Signing you in…" : "Enter family space →"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2d7d6a]/30"></div>
          <p className="text-xs font-extrabold uppercase text-[#2d7d6a]/70">or sign in with</p>
          <div className="h-px flex-1 bg-[#2d7d6a]/30"></div>
        </div>

        {/* Google Button */}
        {onGoogleClick && (
          <Button
            type="button"
            onClick={onGoogleClick}
            disabled={googleBusy || busy}
            className="w-full min-h-[56px] rounded-full font-extrabold bg-white text-[#2d7d6a] hover:bg-white/90 shadow-lg shadow-black/10"
          >
            {googleBusy ? "Signing in…" : "Continue with Google"}
          </Button>
        )}

        {/* Footer Links */}
        <div className="mt-8 space-y-3">
          <div className="text-center">
            <Link
              to="/parent-forgot-password"
              className="text-sm font-bold text-[#2d7d6a] hover:text-[#0d6b52] transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
          <div className="text-center text-sm text-[#2d7d6a]">
            Child learner?{" "}
            <Link to="/child/login" className="font-extrabold text-[#0d6b52] hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </LoginLayout>
  );
}

/**
 * Parent login visual: calming, progress-focused with achievement highlights
 */
function ParentVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
      {/* Background circles */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/3 w-48 h-48 rounded-full bg-white blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full bg-white/50 blur-3xl"></div>
      </div>

      {/* Content - Z above background circles */}
      <div className="relative z-10 text-center max-w-sm">
        {/* Heart icon */}
        <div className="text-6xl mb-6">💙</div>

        {/* Headline */}
        <h2 className="text-2xl font-extrabold text-white mb-3">Support Your Child's Growth</h2>

        {/* Description */}
        <p className="text-white/90 text-sm font-bold max-w-xs mx-auto mb-8">
          Track progress, celebrate milestones, and guide your learner through their TATI journey
        </p>

        {/* Mock progress preview */}
        <div className="bg-white rounded-2xl p-5 shadow-xl max-w-sm text-left mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-extrabold text-[#2d7d6a]">Lesson Progress</span>
            <span className="text-xs font-bold bg-green-100 text-green-700 rounded-full px-3 py-1">
              65%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div className="h-full w-2/3 bg-green-600 rounded-full shadow-md"></div>
          </div>
          <p className="text-xs text-gray-600 font-bold">
            Great progress! Your child completed 13 lessons
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
