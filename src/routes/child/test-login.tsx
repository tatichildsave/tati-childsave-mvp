import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { testChildLogin } from "@/lib/auth/test-child-login.functions";
import { useNavigate } from "@tanstack/react-router";
import { Page, PageHeader, Card, Button, CardTitle, CardNote } from "@/components/tati";

export const Route = createFileRoute("/child/test-login")({
  head: () => ({
    meta: [{ title: "Test Login — TATI ChildSave" }],
  }),
  component: TestLoginPage,
});

const inputClass =
  "min-h-[48px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold";

function TestLoginPage() {
  const navigate = useNavigate();
  const [tatiId, setTatiId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await testChildLogin({ tatiId, pin });
      if (result.profile) {
        navigate({ to: "/child/home", replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please check your TATI ID and PIN.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <PageHeader backTo="/" eyebrow="🧪 Test Login" title="Test Child Login (Emulator Only)" />

      <Card tone="muted" className="mb-5">
        <CardTitle>⚠️ Test Mode</CardTitle>
        <CardNote>This login is for H3.4 testing with Firebase Emulator fixtures only.</CardNote>
      </Card>

      <Card>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold opacity-80">TATI ID</label>
            <input
              type="text"
              value={tatiId}
              onChange={(e) => setTatiId(e.target.value.toUpperCase())}
              placeholder="TATI-XXXXXXXX"
              className={inputClass}
              disabled={busy}
            />
          </div>

          <div>
            <label className="text-xs font-semibold opacity-80">PIN</label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="0000"
              className={inputClass}
              disabled={busy}
              maxLength="6"
            />
            <p className="mt-1 text-xs opacity-60">{pin.length} of 4-6 digits</p>
          </div>

          {error && (
            <div className="rounded-2xl bg-destructive-soft p-4">
              <p className="text-sm font-semibold text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            tone="primary"
            disabled={!tatiId || pin.length < 4 || busy}
            className="w-full"
          >
            {busy ? "Logging in…" : "Start Learning →"}
          </Button>
        </form>
      </Card>

      <Card tone="muted" className="mt-5">
        <CardTitle>📝 Test Fixtures</CardTitle>
        <CardNote>
          Use any TATI ID and PIN from the created test fixtures (Fixture A, B, C, or D) saved in
          test-fixtures-credentials.json
        </CardNote>
      </Card>
    </Page>
  );
}
