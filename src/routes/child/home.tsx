import { createFileRoute } from "@tanstack/react-router";
import { ChildHome } from "@/components/child/ChildHome";

export const Route = createFileRoute("/child/home")({
  head: () => ({
    meta: [
      { title: "My money home — TATI ChildSave" },
      {
        name: "description",
        content: "Continue your money adventure and see your learning journey.",
      },
      { property: "og:title", content: "My money home — TATI ChildSave" },
      { property: "og:description", content: "Track your pocket money, goals and badges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildHome,
});
