import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { completePasswordReset, verifyResetLink } from "../../lib/auth/password-reset-client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

interface SearchParams {
  oobCode?: string;
  mode?: string;
}

export const Route = createFileRoute("/admin/reset-password")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    oobCode: (search.oobCode as string) || "",
    mode: (search.mode as string) || "",
  }),
  component: AdminResetPasswordPage,
  meta: () => [
    {
      title: "Reset Password - TATI ChildSave Admin",
      description: "Create a new password for your admin account",
    },
  ],
});

function AdminResetPasswordPage() {
  const { oobCode } = useSearch({ from: Route.id });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetComplete, setResetComplete] = useState(false);

  // Verify reset code when page loads
  useEffect(() => {
    const verify = async () => {
      if (!oobCode) {
        setError("Invalid or missing reset link. Please request a new one.");
        setVerifying(false);
        return;
      }

      try {
        const accountEmail = await verifyResetLink(oobCode);
        setEmail(accountEmail);
        setVerified(true);
        setMessage("Reset code is valid. You can now create a new password.");
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validate passwords
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!oobCode) {
      setError("Reset code is missing");
      return;
    }

    setLoading(true);

    try {
      await completePasswordReset(oobCode, newPassword);
      setResetComplete(true);
      setMessage("Your password has been reset. You can now log in with your new password.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Still verifying code
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 mt-4">
              Verifying your reset link...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired code
  if (error && !verified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
              {error}
            </div>
            <p className="text-sm text-gray-600">
              Reset links are only valid for 1 hour. If your link has expired,
              you can request a new one.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => (window.location.href = "/admin/forgot-password")}
              >
                Request New Link
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => (window.location.href = "/admin-login")}
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset complete
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Reset Successful</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded text-sm">
              {message}
            </div>
            <p className="text-sm text-gray-600">
              You can now log in with your new password.
            </p>
            <Button
              className="w-full"
              onClick={() => (window.location.href = "/admin-login")}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs text-gray-500">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                {error}
              </div>
            )}

            {message && !error && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded text-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => (window.location.href = "/admin-login")}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
