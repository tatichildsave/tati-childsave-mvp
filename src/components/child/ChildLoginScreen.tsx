import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import logo from "@/assets/tati-logo.png";
import { Button, Card, Page, PageHeader } from "@/components/tati";

type ChildLoginScreenProps = {
  tatiId: string;
  pin: string;
  busy: boolean;
  error: string | null;
  onSubmit: (event: FormEvent) => void;
  onTatiIdChange: (value: string) => void;
  onPinChange: (value: string) => void;
};

export function ChildLoginScreen({
  tatiId,
  pin,
  busy,
  error,
  onSubmit,
  onTatiIdChange,
  onPinChange,
}: ChildLoginScreenProps) {
  return (
    <Page role="junior">
      <PageHeader
        backTo="/"
        eyebrow="TATI Learner Space"
        title="Welcome back"
        subtitle="Enter your TATI ID and 4-digit PIN to continue learning."
      />

      <Card
        tone="surface"
        className="mb-6 rounded-[30px] border border-[#dce6fa] p-5 shadow-card sm:p-6"
      >
        <div className="mb-4 flex items-center justify-center">
          <img
            src={logo}
            alt="TATI ChildSave"
            className="h-12 w-12 rounded-full bg-white p-0.5 shadow-card"
          />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="tati-id" className="mb-2 block text-base font-extrabold text-[#102346]">
              Your TATI ID
            </label>
            <input
              id="tati-id"
              required
              autoCapitalize="characters"
              autoComplete="username"
              value={tatiId}
              onChange={(event) => onTatiIdChange(event.target.value)}
              placeholder="TATI-XXXXXXXX"
              className="min-h-[56px] w-full rounded-2xl border-2 border-[#d5e3ff] bg-[#eef4ff] px-4 text-base font-bold uppercase text-[#102346] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="child-pin"
              className="mb-2 block text-base font-extrabold text-[#102346]"
            >
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
              onChange={(event) => onPinChange(event.target.value)}
              className="min-h-[56px] w-full rounded-2xl border-2 border-[#d5e3ff] bg-[#eef4ff] px-4 text-center text-2xl font-extrabold tracking-[0.5em] text-[#102346] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-describedby={error ? "login-error" : undefined}
            />
            <p className="mt-2 text-xs text-muted-foreground">{pin.length} of 4 digits entered</p>
          </div>

          {error ? (
            <div
              id="login-error"
              role="alert"
              className="flex gap-3 rounded-2xl border border-[#ffd6a0] bg-[#ffedcf] p-4 text-base font-bold text-destructive"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={busy || !tatiId || pin.length !== 4}
            full
            className="rounded-full"
          >
            {busy ? "Checking…" : "Start my journey"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Parent or guardian?{" "}
        <Link to="/login" className="font-extrabold text-primary hover:underline">
          Sign in here
        </Link>
      </p>
    </Page>
  );
}
