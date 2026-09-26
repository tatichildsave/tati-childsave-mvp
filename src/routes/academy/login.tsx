import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Page, PageHeader, Card, CardNote, Button } from "@/components/tati";
import { loginFacilitator, getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";

export const Route = createFileRoute("/academy/login")({
  head: () => ({
    meta: [
      { title: "Sign in — TATI Academy" },
      {
        name: "description",
        content: "Facilitators sign in to guide learners through TATI.",
      },
      { property: "og:title", content: "Sign in — TATI Academy" },
      { property: "og:description", content: "Sign in to TATI Academy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyLogin,
});

const inputClass =
  "min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold";

function AcademyLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Check if already logged in
  useEffect(() => {
    async function checkSession() {
      const session = await getFacilitatorSession();
      if (session?.isFacilitator) {
        navigate({ to: "/academy/dashboard", replace: true });
      }
      setChecking(false);
    }

    checkSession();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const session = await loginFacilitator(email, password);

    if (!session) {
      setError("Invalid email or password, or you don't have facilitator access.");
      setBusy(false);
      return;
    }

    navigate({ to: "/academy/dashboard", replace: true });
  }

  return (
    <Page role="academy">
      <PageHeader
        backTo="/"
        eyebrow="TATI Academy"
        title="Facilitator sign in"
        subtitle="Guide your learners through their TATI journey."
      />

      <Card>
        {checking ? (
          <p className="text-base font-bold text-muted-foreground">Checking your access…</p>
        ) : null}

        {!checking && (
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
                placeholder="facilitator@school.edu"
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
        )}
      </Card>

      <Card tone="muted" className="mt-5">
        <CardNote>
          🏫 You must have a facilitator account to access TATI Academy. Contact your administrator
          if you don't have access.
        </CardNote>
      </Card>
    </Page>
  );
}
