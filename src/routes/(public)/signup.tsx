import { createFileRoute } from "@tanstack/react-router";

// Parent account signup is disabled.
// Parent provisioning is admin-only per business rules #1 and #2.
// See: TATI ChildSave MVP specification - Parents must NOT self-register.

export const Route = createFileRoute("/(public)/signup")({
  head: () => ({
    meta: [
      { title: "Signup Disabled — TATI ChildSave" },
      { name: "description", content: "Parent accounts are provisioned by authorized administrators only." },
    ],
  }),
  component: SignupDisabled,
});

function SignupDisabled() {
  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>Parent Account Signup Disabled</h1>
      <p>Parent accounts are provisioned by authorized TATI administrators only.</p>
      <p>Please contact TATI support if you need access.</p>
      <p>
        <a href="/" style={{ color: "#0066cc" }}>← Return to home</a>
      </p>
    </div>
  );
}
