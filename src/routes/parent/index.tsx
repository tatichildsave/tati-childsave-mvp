import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { useChildProfiles, useSession } from "@/lib/family";
import { clearParentSessionFn } from "@/lib/backend/firebase/family.functions";
import {
  Page,
  PageHeader,
  Card,
  CardTitle,
  CardNote,
  Avatar,
  Button,
  Badge,
  LoadingState,
  EmptyState,
  ErrorState,
} from "@/components/tati";

export const Route = createFileRoute("/parent/")({
  head: () => ({
    meta: [
      { title: "Parent portal — TATI ChildSave" },
      {
        name: "description",
        content:
          "Follow each child's money journey: progress, choices made and what to talk about at home.",
      },
      { property: "og:title", content: "Parent portal — TATI ChildSave" },
      { property: "og:description", content: "Plain-language insights for parents and guardians." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParentHome,
});

function ParentHome() {
  const { data: session } = useSession();
  const { data: children, isLoading, isError, refetch } = useChildProfiles();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    
    // Clear server-side session cookie
    try {
      await clearParentSessionFn({ data: undefined });
    } catch (error) {
      console.error("[handleSignOut] Error clearing session:", error);
      // Continue with client logout even if server-side clear fails
    }
    
    // Sign out from Firebase client
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    
    navigate({ to: "/login", replace: true });
  }

  const parentName = session?.displayName ?? session?.email ?? "there";

  return (
    <Page role="parent">
      <PageHeader
        eyebrow="Parent Portal"
        title="Your family"
        subtitle={`Welcome back, ${parentName}. Let's see how your child is learning.`}
        right={
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-[48px] px-3 text-sm font-extrabold text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Sign out"
          >
            Sign out
          </button>
        }
      />

      {isLoading ? <LoadingState label="Loading your family…" /> : null}

      {isError ? (
        <ErrorState
          title="We couldn't load your family"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && children?.length === 0 ? (
        <EmptyState
          icon="🌱"
          title="No learner yet"
          description="Add your child and their TATI money learning adventure begins right away."
          action={
            <Button to="/onboarding" size="lg">
              Add my child →
            </Button>
          }
        />
      ) : null}

      <div className="space-y-4">
        {children?.map((child) => (
          <Card key={child.id} interactive tone="surface">
            <div className="flex items-center gap-4 mb-4">
              <Avatar avatar={child.avatar} name={child.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-extrabold">
                  {child.name}, {child.age}
                </h2>
                <p className="text-sm font-bold text-muted-foreground">
                  {child.curriculum_level ?? `Primary ${Math.max(1, child.age - 5)}`} learner
                </p>
                {child.tati_id ? (
                  <p className="text-xs font-mono mt-1 text-muted-foreground">
                    TATI: <span className="font-bold">{child.tati_id}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <Link
                to="/parent/child/$childId"
                params={{ childId: child.id }}
                className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-success text-base font-extrabold text-success-foreground hover:opacity-90 transition-opacity active:scale-95"
              >
                See {child.name}'s progress →
              </Link>
              <Link
                to="/learn/$childId"
                params={{ childId: child.id }}
                className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-primary bg-primary-soft text-base font-extrabold text-primary hover:border-primary/80 transition-colors active:scale-95"
              >
                Continue learning journey
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {children && children.length > 0 ? (
        <div className="mt-6 space-y-3">
          <Button to="/parent/feedback" variant="secondary" size="md">
            Share observations
          </Button>
          <Button to="/onboarding" variant="outline" size="md">
            + Add another child
          </Button>
          <Button to="/parent/metrics" variant="ghost" size="md">
            View learning metrics
          </Button>
        </div>
      ) : null}
    </Page>
  );
}
