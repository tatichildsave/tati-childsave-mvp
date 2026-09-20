import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { trackEvent } from "@/lib/analytics";
import { Page, PageHeader, Card, CardTitle, CardNote, Button, Badge } from "@/components/tati";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your parent account — TATI ChildSave" },
      {
        name: "description",
        content: "Create a TATI ChildSave parent account and set up a private learner profile for your child.",
      },
      { property: "og:title", content: "Create your parent account — TATI ChildSave" },
      { property: "og:description", content: "Set up a safe learner profile for your child in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

const inputClass =
  "min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold";

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/parent", replace: true });
    });
  }, [navigate]);

  const longEnough = password.length >= 8;
  const hasNumberOrSymbol = /[\d\W]/.test(password);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit = fullName.trim() && email.trim() && longEnough && matches && agreed && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        void trackEvent("signup_completed", { eventKey: data.user?.id });
        navigate({ to: "/parent", replace: true });
      } else {
        setNote("Almost there — check your email and tap the link to confirm your account.");
      }
    } catch {
      setError("We couldn't create that account right now. Please check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError("Google sign-in didn't work. Please try again.");
  }

  return (
    <Page>
      <PageHeader backTo="/" eyebrow="Parent portal" title="Create your parent account" />

      <Card tone="muted" className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>👪 Guardian setup</CardTitle>
            <CardNote>
              Set up your guardian profile to connect, guide and follow your child's money journey.
            </CardNote>
          </div>
          <Badge tone="success" icon="🛡">
            Safe
          </Badge>
        </div>
      </Card>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-1 block text-base font-bold">
              Your name
            </label>
            <input
              id="name"
              required
              aria-required="true"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ms. Mensah"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-base font-bold">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              aria-required="true"
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent.mensah@gmail.com"
              className={inputClass}
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="password" className="text-base font-bold">
                Password
              </label>
              <span className="text-sm text-muted-foreground">Min. 8 characters</span>
            </div>
            <input
              id="password"
              type="password"
              required
              aria-required="true"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={longEnough ? "success" : "neutral"}>
                {longEnough ? "✓" : "•"} 8+ characters
              </Badge>
              <Badge tone={hasNumberOrSymbol ? "success" : "neutral"}>
                {hasNumberOrSymbol ? "✓" : "•"} Number or symbol
              </Badge>
            </div>
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-base font-bold">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              aria-required="true"
              aria-invalid={confirm.length > 0 && !matches}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
            {confirm ? (
              <p className={`mt-2 text-sm font-bold ${matches ? "text-success" : "text-muted-foreground"}`}>
                {matches ? "✓ Passwords match" : "Passwords don't match yet"}
              </p>
            ) : null}
          </div>

          <label className="flex min-h-[48px] items-start gap-3 rounded-2xl bg-muted p-4 text-base">
            <input
              type="checkbox"
              required
              aria-required="true"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span>
              <span className="font-bold">I agree to the Terms and Child Privacy Policy.</span>{" "}
              <span className="text-muted-foreground">
                TATI protects children's privacy — no bank accounts and no intrusive tracking.
              </span>
            </span>
          </label>

          {error ? (
            <p role="alert" className="rounded-2xl bg-warning-soft p-3 text-base font-bold text-destructive">
              {error}
            </p>
          ) : null}
          {note ? (
            <p role="status" className="rounded-2xl bg-success-soft p-3 text-base font-bold text-success">
              {note}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={!canSubmit}>
            {busy ? "Creating your account…" : "Create Account →"}
          </Button>
        </form>

        <div className="my-5 text-center text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          or sign up with
        </div>
        <Button variant="outline" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <p className="mt-4 text-center text-base">
          Already have an account?{" "}
          <Link to="/login" className="font-extrabold text-primary">
            Sign in
          </Link>
        </p>
      </Card>

      <Card tone="muted" className="mt-5">
        <CardNote>
          🔒 Your child never needs an email, phone number or password. They learn under your
          guardian account.
        </CardNote>
      </Card>
    </Page>
  );
}
