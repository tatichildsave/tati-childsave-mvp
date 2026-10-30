import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, ErrorState, LoadingState, Page } from "@/components/tati";
import { ChildDashboard } from "@/components/child/ChildDashboard";
import { childLogout, getChildSession } from "@/lib/auth/child-auth.functions";
import { useChildLearning } from "@/lib/auth/use-child-learning";

export function ChildHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["child-session"],
    queryFn: getChildSession,
  });
  const learningQuery = useChildLearning();
  const [signOutError, setSignOutError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    try {
      await childLogout();
      queryClient.clear();
      await navigate({ to: "/child/login", replace: true });
    } catch (error) {
      console.error("Could not sign out of child session:", error);
      setSignOutError(true);
      setSigningOut(false);
    }
  }

  if (sessionQuery.isError || learningQuery.isError) {
    return (
      <Page withBottomNav role="junior">
        <ErrorState
          title="Your adventure didn't load"
          description="Please try again. Your progress is safe."
          onRetry={() => {
            void sessionQuery.refetch();
            void learningQuery.refetch();
          }}
        />
      </Page>
    );
  }

  if (sessionQuery.isLoading || learningQuery.isLoading) {
    return (
      <Page withBottomNav role="junior">
        <LoadingState label="Opening your adventure…" />
      </Page>
    );
  }

  if (!sessionQuery.data?.profile) {
    return (
      <Page withBottomNav role="junior">
        <div role="alert" className="rounded-3xl bg-card p-6 text-center shadow-card">
          <h1 className="text-xl font-extrabold">Your session has ended</h1>
          <p className="mt-2 text-muted-foreground">Sign in again to continue your adventure.</p>
          <Button to="/child/login" className="mt-5">
            Sign in
          </Button>
        </div>
      </Page>
    );
  }

  if (!learningQuery.data || !learningQuery.snapshot) {
    return (
      <Page withBottomNav role="junior">
        <ErrorState
          title="Your adventure didn't load"
          description="Please try again. Your progress is safe."
          onRetry={() => void learningQuery.refetch()}
        />
      </Page>
    );
  }

  return (
    <ChildDashboard
      child={sessionQuery.data.profile}
      snapshot={learningQuery.snapshot}
      onSignOut={signOut}
      signingOut={signingOut}
      signOutError={signOutError}
    />
  );
}
