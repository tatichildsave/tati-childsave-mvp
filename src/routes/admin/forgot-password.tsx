import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { requestPasswordReset } from "../../lib/auth/password-reset-client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export const Route = createFileRoute("/admin/forgot-password")({
  component: AdminForgotPasswordPage,
  meta: () => [
    {
      title: "Forgot Password - TATI ChildSave Admin",
      description: "Reset your admin account password",
    },
  ],
});

function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const sentMessage = await requestPasswordReset(email, "/admin/reset-password");

      setMessage(sentMessage);
      setSubmitted(true);
      setEmail("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>Password reset link sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              If an account exists with the email you provided, you will receive
              a password reset link in your inbox within a few minutes.
            </p>
            <p className="text-sm text-gray-600">
              The reset link is valid for 1 hour. Click the link to reset your
              password.
            </p>
            <p className="text-sm text-gray-600">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <div className="pt-4 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => (window.location.href = "/admin-login")}
              >
                Back to Login
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
              >
                Try Another Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {message && (
              <div
                className={`text-sm p-3 rounded ${
                  submitted
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending..." : "Send Reset Link"}
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
