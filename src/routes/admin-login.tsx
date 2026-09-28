import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { getFirebaseFirestore } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { Page, PageHeader, Card, CardNote, Button } from "@/components/tati";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Sign in — TATI ChildSave" },
      {
        name: "description",
        content: "Administrators sign in to the TATI ChildSave admin dashboard.",
      },
      { property: "og:title", content: "Admin Sign in — TATI ChildSave" },
      { property: "og:description", content: "Sign in to your TATI ChildSave admin account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLoginPage,
});

const inputClass =
  "min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold";

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setChecking(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is admin
        const db = getFirebaseFirestore();
        if (db) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const roles = userDocSnap.data()?.roles as string[] | undefined;
            if (Array.isArray(roles) && roles.includes("admin")) {
              navigate({ to: "/admin", replace: true });
              return;
            }
          }
        }
      }
      setChecking(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Authentication not available. Please reload the page.");
        setBusy(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Verify admin role
      const db = getFirebaseFirestore();
      if (db) {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const roles = userDocSnap.data()?.roles as string[] | undefined;
          if (Array.isArray(roles) && roles.includes("admin")) {
            navigate({ to: "/admin", replace: true });
            return;
          }
        }
      }

      setError("You do not have admin privileges. Please contact support.");
      setBusy(false);
    } catch (signInError) {
      const message = signInError instanceof Error ? signInError.message.toLowerCase() : "";
      setError(
        message.includes("invalid") ||
          message.includes("wrong-password") ||
          message.includes("user-not-found")
          ? "That email and password don't match. Please try again."
          : "We couldn't sign you in right now. Please try again.",
      );
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Authentication not available. Please reload the page.");
        return;
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Verify admin role
      const db = getFirebaseFirestore();
      if (db) {
        const userDocRef = doc(db, "users", result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const roles = userDocSnap.data()?.roles as string[] | undefined;
          if (Array.isArray(roles) && roles.includes("admin")) {
            navigate({ to: "/admin", replace: true });
            return;
          }
        }
      }

      setError("You do not have admin privileges. Please contact support.");
    } catch (googleError) {
      const message =
        googleError instanceof Error ? googleError.message.toLowerCase() : "";
      if (!message.includes("popup-closed")) {
        setError("We couldn't sign you in with Google right now. Please try again.");
      }
    }
  }

  if (checking) {
    return <div className="flex items-center justify-center min-h-screen">Checking credentials...</div>;
  }

  return (
    <Page>
      <PageHeader title="Admin Sign In" description="Sign in to access the admin dashboard." />
      <div className="space-y-4 max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className={inputClass}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="email"
              required
            />
            <input
              className={inputClass}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="current-password"
              required
            />
            {error && <CardNote variant="error" text={error} />}
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={busy}
              className="w-full"
            >
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Or sign in with Google</p>
            <Button
              variant="secondary"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full"
            >
              {busy ? "Signing in..." : "Sign in with Google"}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="text-center text-sm text-gray-600">
            <p className="mb-4">Not an admin? Return to regular login.</p>
            <Link to="/login" className="text-blue-600 hover:underline">
              Go back to sign in
            </Link>
          </div>
        </Card>
      </div>
    </Page>
  );
}
