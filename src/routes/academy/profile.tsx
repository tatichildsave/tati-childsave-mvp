import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardTitle, Button, LoadingState } from "@/components/tati";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { getFacilitatorSession, logoutFacilitator } from "@/lib/auth/facilitator-auth.functions";

export const Route = createFileRoute("/academy/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TATI Academy" },
      {
        name: "description",
        content: "Manage your TATI Academy account.",
      },
      { property: "og:title", content: "Profile — TATI Academy" },
      { property: "og:description", content: "Your facilitator profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyProfile,
});

function AcademyProfile() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [isLoading, session?.isFacilitator, navigate]);

  async function handleLogout() {
    await qc.cancelQueries();
    qc.clear();
    await logoutFacilitator();
    navigate({ to: "/academy/login", replace: true });
  }

  if (isLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Loading your profile…" />
      </AcademyShell>
    );
  }

  // If not authenticated, don't render anything (useEffect will redirect)
  if (!session?.isFacilitator) {
    return null;
  }

  return (
    <AcademyShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="mt-1 text-base text-muted-foreground">Manage your facilitator account.</p>
        </div>

        {/* Profile information card */}
        <Card>
          <CardTitle>Your Information</CardTitle>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Display name
              </p>
              <p className="mt-1 text-base font-bold text-foreground">{session?.displayName}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <p className="mt-1 text-base font-bold text-foreground">{session?.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                User ID
              </p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{session?.uid}</p>
            </div>
          </div>
        </Card>

        {/* Session management */}
        <Card>
          <CardTitle>Session Management</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Foundation profile — Password reset and additional settings coming in future phases.
          </p>
          <Button variant="outline" onClick={handleLogout} className="mt-4">
            Sign out
          </Button>
        </Card>

        {/* Help & support */}
        <Card tone="muted">
          <p className="text-sm font-bold text-foreground">🆘 Need help?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact your administrator if you have issues accessing TATI Academy or managing your
            account.
          </p>
        </Card>
      </div>
    </AcademyShell>
  );
}
