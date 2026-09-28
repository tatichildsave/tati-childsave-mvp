import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)")({
  ssr: false,
  component: () => <Outlet />,
});
