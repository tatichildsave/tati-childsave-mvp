import { createFileRoute } from "@tanstack/react-router";
import { Page, Card, Button, Badge, Logo, ListenButton, StatCard } from "@/components/tati";
import heroImage from "@/assets/tati-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TATI ChildSave — money skills for Ghanaian children" },
      {
        name: "description",
        content:
          "TATI ChildSave helps children aged 8–12 practise real money decisions with pocket money, savings goals and school challenges in Ghanaian cedis.",
      },
      { property: "og:title", content: "TATI ChildSave — money skills for Ghanaian children" },
      {
        property: "og:description",
        content: "Learn money skills. Make your own choices. Built for learners aged 8–12 in Ghana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <Page>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="text-lg font-extrabold text-primary">
              TATI <span className="text-success">ChildSave</span>
            </p>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Financial capability for kids
            </p>
          </div>
        </div>
        <ListenButton />
      </header>

      <Card className="overflow-hidden p-0">
        <div className="relative">
          <img
            src={heroImage}
            alt="Two Ghanaian school children dropping cedi coins into a savings jar"
            width={1024}
            height={640}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="h-52 w-full object-cover"
          />
          <span className="absolute right-4 top-4">
            <Badge tone="warning" solid icon="🎓">
              Ages 8–12
            </Badge>
          </span>
          <span className="absolute bottom-4 left-4 rounded-full bg-card px-4 py-2 text-base font-extrabold shadow-card">
            <span aria-hidden="true">🟢</span> Goal: <span className="text-success">GH₵50</span>
          </span>
        </div>
        <div className="p-5">
          <h1 className="text-3xl font-extrabold leading-tight">
            Learn Money Skills.
            <br />
            Make Your Own Choices!
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Practice real-life decisions with pocket money, savings goals and exciting school
            challenges.
          </p>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard label="Save Smart" value="GH₵10+" tone="primary" icon="🐖" />
        <StatCard label="Wise Spend" value="Snacks" tone="warning" icon="🛍" />
        <StatCard label="Badges" value="Stars" tone="success" icon="⭐" />
      </div>

      <div className="mt-6 space-y-3">
        <Button to="/signup" size="lg">
          Create Parent Account →
        </Button>
        <Button to="/login" variant="outline" size="lg">
          I already have an account
        </Button>
        <Button to="/parent" variant="ghost">
          Continue My Journey
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <span aria-hidden="true">🛡</span> Safe &amp; private. Designed for learners aged 8–12 with
        Ghanaian schools.
      </p>
    </Page>
  );
}
