import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChildLoginScreen } from "@/components/child/ChildLoginScreen";
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
    <ChildLoginScreen
      tatiId={tatiId}
      pin={pin}
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      onTatiIdChange={(value) => setTatiId(value.toUpperCase())}
      onPinChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))}
    />
  );
}
