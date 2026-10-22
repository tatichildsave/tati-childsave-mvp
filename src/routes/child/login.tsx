import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Card, Page, PageHeader } from "@/components/tati";
import { childLogin, genericFailure } from "@/lib/auth/child-auth.functions";

export const Route = createFileRoute("/child/login")({
  ssr: false,
  component: ChildLogin,
});

function ChildLogin() {
  const navigate = useNavigate();
  const [tatiId, setTatiId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await childLogin({ data: { tatiId, pin } });
      await navigate({ to: "/child/home", replace: true });
    } catch {
      setError(genericFailure);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page role="junior">
      <PageHeader
        backTo="/"
        eyebrow="🎮 TATI Learner Space"
        title="Welcome back"
        subtitle="Enter your TATI ID and 4-digit PIN to continue learning."
      />

      <Card tone="surface" className="mb-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="tati-id" className="mb-2 block text-base font-extrabold">
              Your TATI ID
            </label>
            <input
              id="tati-id"
              required
              autoCapitalize="characters"
              autoComplete="username"
              value={tatiId}
              onChange={(event) => setTatiId(event.target.value.toUpperCase())}
              placeholder="TATI-XXXXXXXX"
              className="min-h-[56px] w-full rounded-2xl border-2 border-border bg-background px-4 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          <div>
            <label htmlFor="child-pin" className="mb-2 block text-base font-extrabold">
              Your 4-digit PIN
            </label>
            <input
              id="child-pin"
              required
              inputMode="numeric"
              autoComplete="current-password"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              className="min-h-[56px] w-full rounded-2xl border-2 border-border bg-background px-4 text-center text-2xl font-extrabold tracking-[0.5em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-describedby={error ? "login-error" : undefined}
            />
            <p className="mt-2 text-xs text-muted-foreground">{pin.length} of 4 digits entered</p>
          </div>

          {error ? (
            <div
              id="login-error"
              role="alert"
              className="flex gap-3 rounded-2xl bg-warning-soft p-4 text-base font-bold text-destructive"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          ) : null}

          <Button type="submit" size="lg" disabled={busy || !tatiId || pin.length !== 4} full>
            {busy ? "✓ Checking…" : "Start my journey →"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        👤 Parent or guardian?{" "}
        <Link to="/login" className="font-extrabold text-primary hover:underline">
          Sign in here
        </Link>
      </p>
    </Page>
  );
}
