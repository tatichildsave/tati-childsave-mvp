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
    <Page>
      <PageHeader
        backTo="/"
        eyebrow="TATI learner space"
        title="Welcome back"
        subtitle="Enter your TATI ID and PIN to continue your journey."
      />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="tati-id" className="mb-1 block text-base font-extrabold">
              TATI ID
            </label>
            <input
              id="tati-id"
              required
              autoCapitalize="characters"
              autoComplete="username"
              value={tatiId}
              onChange={(event) => setTatiId(event.target.value.toUpperCase())}
              placeholder="TATI-XXXXXXXX"
              className="min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold"
            />
          </div>
          <div>
            <label htmlFor="child-pin" className="mb-1 block text-base font-extrabold">
              PIN
            </label>
            <input
              id="child-pin"
              required
              inputMode="numeric"
              autoComplete="current-password"
              type="password"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              className="min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold tracking-[0.3em]"
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
          <Button type="submit" size="lg" disabled={busy || !tatiId || !pin}>
            {busy ? "Checking…" : "Start my journey →"}
          </Button>
        </form>
      </Card>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Parent or guardian?{" "}
        <Link to="/login" className="font-extrabold text-primary">
          Sign in here
        </Link>
      </p>
    </Page>
  );
}
