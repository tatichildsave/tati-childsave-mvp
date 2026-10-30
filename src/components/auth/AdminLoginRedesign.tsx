import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/tati-logo.png";
import { Button } from "@/components/tati";
import { LoginLayout } from "./shared/LoginLayout";
import { cn } from "@/lib/utils";

type AdminLoginRedesignProps = {
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function AdminLoginRedesign({
  email,
  password,
  busy,
  error,
  onSubmit,
  onEmailChange,
  onPasswordChange,
}: AdminLoginRedesignProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <LoginLayout
      visualClassName="bg-gradient-to-b from-[#0e194b] via-[#141f52] to-[#0a1232] relative overflow-hidden"
      visual={<AdminVisual />}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <span className="text-xl">🛡️</span>
            <span className="text-xs font-bold tracking-wider text-[#0e194b] uppercase">
              Management Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight">Admin Portal</h1>
          <p className="mt-4 text-base text-blue-100">
            Authorized administrators only. Manage the TATI platform and monitor system health.
          </p>
        </div>

        {/* Security notice */}
        <div className="mb-6 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/30 p-4 flex gap-3">
          <Lock className="h-5 w-5 text-white shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-white/90">
            This portal is restricted to authorized administrators. All activity is logged for
            security.
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
              placeholder="admin@tati.example.com"
              className={cn(
                "w-full min-h-[56px] rounded-2xl border-2 px-4 text-base font-bold",
                "bg-white/95 border-white/30 text-[#0e194b] placeholder-gray-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e194b]",
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
                "bg-white/95 border-white/30 text-[#0e194b] placeholder-gray-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e194b]",
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
              "bg-gradient-to-r from-blue-600 to-[#0e194b] text-white",
              "hover:shadow-lg hover:from-blue-700 hover:to-[#132554]",
              "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-lg shadow-blue-600/40 transition-all",
            )}
          >
            {busy ? "Authenticating…" : "Access Admin Portal →"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 space-y-4">
          <div className="text-center">
            <Link
              to="/admin/forgot-password"
              className="text-sm font-bold text-white/80 hover:text-white transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-blue-100 text-center">
              If you are not an authorized administrator, you cannot access this portal.
            </p>
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm font-bold text-white hover:text-blue-100 transition-colors"
              >
                Return to regular login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </LoginLayout>
  );
}

/**
 * Admin login visual: secure, professional, authoritative
 */
function AdminVisual() {
  return (
    <div className="relative w-full h-64 sm:h-80 lg:h-full flex flex-col items-center justify-center p-8">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-sm">
        {/* Large shield icon */}
        <div className="mb-8 text-7xl drop-shadow-lg">🛡️</div>

        {/* Headline */}
        <h2 className="text-2xl font-extrabold text-white mb-3">Platform Administration</h2>

        {/* Description */}
        <p className="text-white/80 text-sm font-bold mb-8">
          Manage TATI ChildSave operations, user accounts, and platform settings
        </p>

        {/* Access indicators */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-white/70 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
            User management
          </div>
          <div className="flex items-center justify-center gap-2 text-white/70 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
            Content moderation
          </div>
          <div className="flex items-center justify-center gap-2 text-white/70 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
            Analytics and reports
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-8 inline-block rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2">
          <p className="text-xs font-extrabold text-white">🔒 SSL Encrypted</p>
        </div>
      </div>
    </div>
  );
}
