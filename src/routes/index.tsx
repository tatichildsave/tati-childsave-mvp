import { createFileRoute } from "@tanstack/react-router";
import { WelcomePage } from "@/components/welcome/WelcomePage";

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
  component: WelcomePage,
});
