import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  ArrowRight,
  GraduationCap,
  Lock,
  PiggyBank,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ListenButton, Logo } from "@/components/tati";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import kidsHero from "@/assets/tati-kids-hero.webp";

const signInRoles: ReadonlyArray<{
  to: "/child/login" | "/login" | "/academy/login" | "/admin-login";
  title: string;
  description: string;
  icon: LucideIcon;
  chip: string;
}> = [
  {
    to: "/child/login",
    title: "Learner sign in",
    description: "Use your TATI ID and 4-digit PIN.",
    icon: Sparkles,
    chip: "bg-success-soft text-success",
  },
  {
    to: "/login",
    title: "Parent sign in",
    description: "Access your family's TATI account.",
    icon: Users,
    chip: "bg-primary-soft text-primary",
  },
  {
    to: "/academy/login",
    title: "Facilitator sign in",
    description: "Open your facilitator workspace.",
    icon: GraduationCap,
    chip: "bg-warning-soft text-accent-foreground",
  },
  {
    to: "/admin-login",
    title: "Admin sign in",
    description: "Manage families and facilitators.",
    icon: ShieldCheck,
    chip: "bg-secondary text-secondary-foreground",
  },
];

const featureItems: ReadonlyArray<{
  title: string;
  description: string;
  icon: LucideIcon;
  chip: string;
}> = [
  {
    title: "Save smart",
    description: "Set money aside for the things you want.",
    icon: PiggyBank,
    chip: "bg-success-soft text-success",
  },
  {
    title: "Spend wisely",
    description: "Weigh real choices before you spend.",
    icon: ShoppingBag,
    chip: "bg-warning-soft text-accent-foreground",
  },
  {
    title: "Earn badges",
    description: "Collect achievements as you progress.",
    icon: Award,
    chip: "bg-primary-soft text-primary",
  },
  {
    title: "Safe and private",
    description: "Built for learners aged 8–12 in Ghanaian schools.",
    icon: Lock,
    chip: "bg-secondary text-secondary-foreground",
  },
];

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
        content:
          "Learn money skills. Make your own choices. Built for learners aged 8–12 in Ghana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight text-primary">
                TATI <span className="text-success">ChildSave</span>
              </p>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Financial capability for kids
              </p>
            </div>
          </div>
          <ListenButton />
        </header>

        <main className="mt-8 grid items-start gap-8 lg:mt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <section aria-labelledby="welcome-heading" className="min-w-0 space-y-6">
            <div className="relative overflow-hidden rounded-3xl shadow-card">
              <img
                src={kidsHero}
                alt="Four school children standing together in front of a school building"
                width={1365}
                height={768}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="block h-auto w-full"
              />
              <span className="absolute right-4 top-4 rounded-full bg-warning px-4 py-1.5 text-sm font-extrabold text-accent-foreground shadow-card">
                Ages 8–12
              </span>
            </div>
            <div>
              <h1
                id="welcome-heading"
                className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl"
              >
                Learn Money Skills.
                <br />
                Make Your Own Choices!
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Practise real-life decisions with pocket money, savings goals and exciting school
                challenges.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="sign-in-heading"
            className="min-w-0 rounded-3xl bg-card p-5 shadow-card sm:p-6 lg:mt-8"
          >
            <h2 id="sign-in-heading" className="text-xl font-extrabold">
              Who is signing in?
            </h2>
            <ul className="mt-4 space-y-3">
              {signInRoles.map((role) => {
                const Icon = role.icon;
                return (
                  <li key={role.to}>
                    <Link
                      to={role.to}
                      className={cn(
                        "group flex min-h-[72px] items-center gap-4 rounded-2xl border-2 border-border bg-background p-4",
                        "transition-[border-color,box-shadow,transform] duration-150 hover:border-primary hover:shadow-card active:scale-[0.99]",
                        "motion-reduce:transition-none motion-reduce:active:scale-100",
                        tatiTheme.focusRing,
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                          role.chip,
                        )}
                      >
                        <Icon aria-hidden="true" className="h-6 w-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-extrabold">{role.title}</span>
                        <span className="block text-base text-muted-foreground">
                          {role.description}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transition-none"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </main>

        <section aria-labelledby="features-heading" className="mt-10 lg:mt-12">
          <h2 id="features-heading" className="sr-only">
            What children learn
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex min-w-0 items-start gap-3 rounded-2xl bg-card p-4 shadow-card"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      item.chip,
                    )}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-extrabold">{item.title}</span>
                    <span className="block text-sm text-muted-foreground">{item.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

