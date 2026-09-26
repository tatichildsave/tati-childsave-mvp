import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChildProfiles, useSession } from "@/lib/family";
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

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const parentName =
    (session?.user_metadata?.["full_name"] as string | undefined) ?? session?.email ?? "there";

  return (
    <Page>
      <PageHeader
        eyebrow="Parent portal"
        title="Your family"
        subtitle={`Welcome back, ${parentName}.`}
        right={
          <button
            type="button"
            onClick={signOut}
            className="min-h-[48px] px-2 text-sm font-extrabold text-muted-foreground"
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
          description="Add your child and their TATI adventure begins right away."
          action={
            <Button to="/onboarding" size="lg">
              Add my child →
            </Button>
          }
        />
      ) : null}

      <div className="space-y-4">
        {children?.map((child) => (
          <Card key={child.id}>
            <div className="flex items-center gap-3">
              <Avatar avatar={child.avatar} name={child.name} size="md" />
              <div className="min-w-0 flex-1">
                <CardTitle>
                  {child.name}, {child.age}
                </CardTitle>
                <CardNote className="truncate">
                  {child.curriculum_level ?? `Primary ${Math.max(1, child.age - 5)}`} · TATI Junior
                </CardNote>
              </div>
              <Badge tone="primary">Junior</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <Link
                to="/learn/$childId"
                params={{ childId: child.id }}
                className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground"
              >
                Continue {child.name}'s journey →
              </Link>
              <Link
                to="/parent/child/$childId"
                params={{ childId: child.id }}
                className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-border bg-card text-base font-extrabold"
              >
                See progress and insights
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {children && children.length > 0 ? (
        <div className="mt-6 space-y-3">
          <Button to="/parent/feedback" variant="secondary">
            Share parent feedback
          </Button>
          <Button to="/parent/metrics" variant="ghost">
            View MVP metrics
          </Button>
          <Button to="/onboarding" variant="outline">
            + Add another child
          </Button>
        </div>
      ) : null}
    </Page>
  );
}
