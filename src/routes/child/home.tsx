import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Page, Card, CardTitle, Avatar, Badge, ListenButton, XPIndicator } from "@/components/tati";
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
      <Page withBottomNav>
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Opening your journey…
        </p>
      </Page>
    );
  }

  return (
    <Page withBottomNav>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold text-primary">TATI ChildSave</p>
          <p className="text-sm font-bold text-muted-foreground">Home</p>
        </div>
        <div className="flex items-center gap-2">
          <ListenButton />
          <button
            type="button"
            onClick={signOut}
            className="min-h-[48px] text-sm font-extrabold text-muted-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <Card className="flex items-center gap-3">
        <Avatar avatar={child.avatar} name={child.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-extrabold">Hi {child.name} 👋</p>
          <p className="text-sm font-bold text-muted-foreground">
            {child.curriculum_level ?? `Primary ${Math.max(1, child.age - 5)}`} · TATI learner
          </p>
        </div>
      </Card>

      <XPIndicator xp={snapshot.game.xp} level={snapshot.game.level} className="mt-3" />

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Your current challenge</h2>
        <span className="text-sm font-extrabold text-success">New mission</span>
      </div>
      {snapshot.currentItem ? (
        <Card>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Up next</p>
          <h2 className="mt-1 text-xl font-extrabold">{itemTitle(track, snapshot.currentItem)}</h2>
          <p className="mt-1 text-muted-foreground">Keep going on your adventure trail.</p>
        </Card>
      ) : null}

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">📖 My learning journey</h2>
        <Badge tone="neutral">
          {snapshot.countsByKind.lesson.done} of {snapshot.countsByKind.lesson.total} completed
        </Badge>
      </div>
      <Card>
        <p className="text-base text-muted-foreground">
          {snapshot.journey.doneItems.length} of {snapshot.track.sequence.length} activities
          complete. Your next stop is waiting in My Journey.
        </p>
      </Card>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">🏅 Achievements</h2>
        <span className="text-sm font-bold text-muted-foreground">
          {snapshot.game.earnedBadges.length} earned
        </span>
      </div>
      <div className="space-y-3">
        {snapshot.game.earnedBadges.map((badge) => (
          <Card key={badge.definition.id} className="flex items-center gap-3">
            <span aria-hidden="true" className="text-2xl">
              {badge.definition.icon}
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle>{badge.definition.name}</CardTitle>
              <p className="truncate text-sm text-muted-foreground">{badge.definition.blurb}</p>
            </div>
            <Badge tone="success">Earned</Badge>
          </Card>
        ))}
      </div>
    </Page>
  );
}
