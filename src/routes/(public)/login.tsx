import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { Page, PageHeader, Card, CardNote, Button } from "@/components/tati";

export const Route = createFileRoute("/(public)/login")({
  head: () => ({
    meta: [
      { title: "Sign in — TATI ChildSave" },
      {
        name: "description",
        content: "Parents sign in to continue their child's TATI money journey.",
      },
      { property: "og:title", content: "Sign in — TATI ChildSave" },
      { property: "og:description", content: "Sign in to your TATI ChildSave parent account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const inputClass =
  "min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold";

function LoginPage() {
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

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate({ to: "/parent", replace: true });
      } else {
        setChecking(false);
      }
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
      if (userCredential.user) {
        navigate({ to: "/parent", replace: true });
      }
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
      await signInWithPopup(auth, provider);
      navigate({ to: "/parent", replace: true });
    } catch (googleError) {
      const message = googleError instanceof Error ? googleError.message : "";
      if (message.includes("popup-closed")) {
        // User closed the popup, not an error
        return;
      }
      setError("Google sign-in didn't work. Please try again.");
    }
  }

  return (
    <Page>
      <PageHeader
        backTo="/"
        eyebrow="Parent portal"
        title="Welcome back"
        subtitle="Continue your child's TATI journey."
      />

      <Card>
        {checking ? (
          <p className="text-base font-bold text-muted-foreground">Restoring your session…</p>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-base font-bold">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              aria-required="true"
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kwame.owusu@gmail.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-base font-bold">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              aria-required="true"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl bg-warning-soft p-3 text-base font-bold text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={busy || !email || !password}>
            {busy ? "Signing you in…" : "Sign In →"}
          </Button>
        </form>

        <div className="my-5 text-center text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          or sign in with
        </div>
        <Button variant="outline" onClick={handleGoogle}>
          Continue with Google
        </Button>
      </Card>

      <Card tone="muted" className="mt-5">
        <CardNote>
          🎓 Your child's learner profile lives inside your account — no separate login needed.
        </CardNote>
      </Card>

      <p className="mt-5 text-center text-base">
        New to TATI?{" "}
        <Link to="/signup" className="font-extrabold text-primary">
          Create an account
        </Link>
      </p>
    </Page>
  );
}
