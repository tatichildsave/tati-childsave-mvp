import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Page,
  Card,
  CardTitle,
  Avatar,
  Badge,
  ListenButton,
  XPIndicator,
  Button,
} from "@/components/tati";
import { childLogout, getChildSession } from "@/lib/auth/child-auth.functions";
import { useChildLearning } from "@/lib/auth/use-child-learning";
import { getTrack, itemTitle } from "@/lib/learning/track";

export const Route = createFileRoute("/child/home")({
  head: () => ({
    meta: [
      { title: "My money home — TATI ChildSave" },
      {
        name: "description",
        content:
          "Your challenge, your savings and your learning journey in one place, all in cedis.",
      },
      { property: "og:title", content: "My money home — TATI ChildSave" },
      { property: "og:description", content: "Track your pocket money, goals and badges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildHome,
});

function ChildHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useQuery({
    queryKey: ["child-session"],
    queryFn: getChildSession,
  });
  const child = session?.profile;
  const { snapshot, data: learning } = useChildLearning();
  const track = getTrack("save");

  async function signOut() {
    await childLogout();
    queryClient.clear();
    await navigate({ to: "/child/login", replace: true });
  }

  if (isLoading || !child || !snapshot || !learning) {
    return (
      <Page withBottomNav role="junior">
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="font-bold">Opening your journey…</p>
        </div>
      </Page>
    );
  }

  return (
    <Page withBottomNav role="junior">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Welcome back
          </p>
          <p className="text-2xl font-extrabold text-primary">TATI ChildSave</p>
        </div>
        <div className="flex items-center gap-2">
          <ListenButton className="!min-w-auto" />
          <button
            type="button"
            onClick={signOut}
            className="min-h-[48px] px-3 text-sm font-extrabold text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Profile Card */}
      <Card tone="surface" className="mb-6 flex items-center gap-4">
        <Avatar avatar={child.avatar} name={child.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-extrabold">Hi {child.name} 👋</p>
          <p className="text-sm font-bold text-muted-foreground">
            {child.curriculum_level ?? `Primary ${Math.max(1, child.age - 5)}`} learner
          </p>
        </div>
      </Card>

      {/* XP Progress */}
      <XPIndicator xp={snapshot.game.xp} level={snapshot.game.level} className="mb-6" />

      {/* Current Challenge Section */}
      <div className="mb-4">
        <h2 className="mb-3 text-lg font-extrabold">Your current challenge</h2>
        {snapshot.currentItem ? (
          <Card interactive tone="primary" className="cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-white/80">
                  {snapshot.currentItem.kind}
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-white">
                  {itemTitle(track, snapshot.currentItem)}
                </h3>
                <p className="mt-2 text-sm text-white/70">Keep going on your adventure trail.</p>
              </div>
              <span className="text-2xl" aria-hidden="true">
                →
              </span>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Learning Journey Section */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">📖 My learning journey</h2>
          <Badge tone="success">
            {snapshot.journey.doneItems.length} of {snapshot.track.sequence.length}
          </Badge>
        </div>
        <Card tone="muted">
          <p className="text-base text-muted-foreground">
            {snapshot.journey.doneItems.length} of {snapshot.track.sequence.length} activities
            complete.
          </p>
          <Button to="/child/learn" className="mt-4" variant="primary" size="md">
            Continue my journey →
          </Button>
        </Card>
      </div>

      {/* Achievements Section */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">🏅 Achievements</h2>
          <span className="text-xs font-bold text-muted-foreground">
            {snapshot.game.earnedBadges.length} earned
          </span>
        </div>
        {snapshot.game.earnedBadges.length > 0 ? (
          <div className="space-y-2">
            {snapshot.game.earnedBadges.slice(0, 3).map((badge) => (
              <Card key={badge.definition.id} tone="surface">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-2xl flex-shrink-0">
                    {badge.definition.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{badge.definition.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {badge.definition.blurb}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            {snapshot.game.earnedBadges.length > 3 && (
              <Button to="/child/progress" variant="ghost" size="md">
                View all {snapshot.game.earnedBadges.length} badges →
              </Button>
            )}
          </div>
        ) : (
          <Card tone="muted">
            <p className="text-center text-sm text-muted-foreground">
              Earn badges as you complete your challenges! 🌟
            </p>
          </Card>
        )}
      </div>
    </Page>
  );
}
