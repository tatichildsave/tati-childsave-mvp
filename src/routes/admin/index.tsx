import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardRedirect,
});

function AdminDashboardRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/admin/dashboard-v2", replace: true });
  }, [navigate]);

  return null;
}
