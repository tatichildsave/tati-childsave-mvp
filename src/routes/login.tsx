import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Page, PageHeader, Card, CardNote, Button } from "@/components/tati";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — TATI ChildSave" },
      {
        name: "description",
        content: "Parents sign in to continue their child's TATI money journey.",
      },
      { property: "og:title", content: "Sign in — TATI ChildSave" },
      { property: "og:description", content: "Sign in to your TATI ChildSave parent account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const inputClass =
  "min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/parent", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("invalid")
          ? "That email and password don't match. Please try again."
          : "We couldn't sign you in right now. Please try again.",
      );
    } else if (data.session) {
      navigate({ to: "/parent", replace: true });
    }
    setBusy(false);
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
      <PageHeader
        backTo="/"
        eyebrow="Parent portal"
        title="Welcome back"
        subtitle="Continue your child's TATI journey."
      />

      <Card>
        {checking ? (
          <p className="text-base font-bold text-muted-foreground">Restoring your session…</p>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              placeholder="kwame.owusu@gmail.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-base font-bold">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              aria-required="true"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl bg-warning-soft p-3 text-base font-bold text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={busy || !email || !password}>
            {busy ? "Signing you in…" : "Sign In →"}
          </Button>
        </form>

        <div className="my-5 text-center text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          or sign in with
        </div>
        <Button variant="outline" onClick={handleGoogle}>
          Continue with Google
        </Button>
      </Card>

      <Card tone="muted" className="mt-5">
        <CardNote>
          🎓 Your child's learner profile lives inside your account — no separate login needed.
        </CardNote>
      </Card>

      <p className="mt-5 text-center text-base">
        New to TATI?{" "}
        <Link to="/signup" className="font-extrabold text-primary">
          Create an account
        </Link>
      </p>
    </Page>
  );
}
