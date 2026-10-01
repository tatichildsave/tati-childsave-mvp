import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { createParentSessionFn } from "@/lib/backend/firebase/family.functions";
import { trackEvent } from "@/lib/analytics";
import { Page, PageHeader, Card, CardTitle, CardNote, Button, Badge } from "@/components/tati";

export const Route = createFileRoute("/(public)/signup")({
  head: () => ({
    meta: [
      { title: "Create your parent account — TATI ChildSave" },
      {
        name: "description",
        content:
          "Create a TATI ChildSave parent account and set up a private learner profile for your child.",
      },
      { property: "og:title", content: "Create your parent account — TATI ChildSave" },
      {
        property: "og:description",
        content: "Set up a safe learner profile for your child in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

const inputClass =
  "min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-base font-bold";

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate({ to: "/parent", replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const longEnough = password.length >= 8;
  const hasNumberOrSymbol = /[\d\W]/.test(password);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    longEnough &&
    hasNumberOrSymbol &&
    matches &&
    agreed &&
    !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Authentication not available. Please reload the page.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      console.log("[signup] User created:", userCredential.user.uid);

      // Update user profile with display name
      await updateProfile(userCredential.user, { displayName: fullName.trim() });
      console.log("[signup] Profile updated");

      // Create server session cookie with ID token
      console.log("[signup] Getting ID token...");
      const idToken = await userCredential.user.getIdToken();
      console.log("[signup] ID token obtained:", idToken.substring(0, 50) + "...");
      
      console.log("[signup] Calling createParentSessionFn...");
      await createParentSessionFn({ data: { idToken } });
      console.log("[signup] createParentSessionFn completed successfully");

      // Track signup event
      void trackEvent("signup_completed", { eventKey: userCredential.user.uid });

      console.log("[signup] Navigating to /parent");
      navigate({ to: "/parent", replace: true });
    } catch (signupError) {
      console.error("[signup] Error during signup:", signupError);
      const message = signupError instanceof Error ? signupError.message.toLowerCase() : "";
      setError(
        message.includes("already-in-use") || message.includes("email-already-in-use")
          ? "An account with this email already exists. Try signing in instead."
          : message.includes("weak-password")
            ? "Choose a password with at least 8 characters, including a number or symbol."
            : "We couldn't create that account right now. Please check your details and try again.",
      );
    } finally {
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
      
      // Create server session cookie with ID token
      const idToken = await result.user.getIdToken();
      await createParentSessionFn({ data: { idToken } });
      
      void trackEvent("signup_completed", { eventKey: result.user.uid });
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
      <PageHeader backTo="/" eyebrow="Parent portal" title="Create your parent account" />

      <Card tone="muted" className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>👪 Guardian setup</CardTitle>
            <CardNote>
              Set up your guardian profile to connect, guide and follow your child's money journey.
            </CardNote>
          </div>
          <Badge tone="success" icon="🛡">
            Safe
          </Badge>
        </div>
      </Card>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-1 block text-base font-bold">
              Your name
            </label>
            <input
              id="name"
              required
              aria-required="true"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ms. Mensah"
              className={inputClass}
            />
          </div>
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
              placeholder="parent.mensah@gmail.com"
              className={inputClass}
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="password" className="text-base font-bold">
                Password
              </label>
              <span className="text-sm text-muted-foreground">Min. 8 characters</span>
            </div>
            <input
              id="password"
              type="password"
              required
              aria-required="true"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={longEnough ? "success" : "neutral"}>
                {longEnough ? "✓" : "•"} 8+ characters
              </Badge>
              <Badge tone={hasNumberOrSymbol ? "success" : "neutral"}>
                {hasNumberOrSymbol ? "✓" : "•"} Number or symbol
              </Badge>
            </div>
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-base font-bold">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              aria-required="true"
              aria-invalid={confirm.length > 0 && !matches}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
            {confirm ? (
              <p
                className={`mt-2 text-sm font-bold ${matches ? "text-success" : "text-muted-foreground"}`}
              >
                {matches ? "✓ Passwords match" : "Passwords don't match yet"}
              </p>
            ) : null}
          </div>

          <label className="flex min-h-[48px] items-start gap-3 rounded-2xl bg-muted p-4 text-base">
            <input
              type="checkbox"
              required
              aria-required="true"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span>
              <span className="font-bold">I agree to the Terms and Child Privacy Policy.</span>{" "}
              <span className="text-muted-foreground">
                TATI protects children's privacy — no bank accounts and no intrusive tracking.
              </span>
            </span>
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl bg-warning-soft p-3 text-base font-bold text-destructive"
            >
              {error}
            </p>
          ) : null}
          {note ? (
            <p
              role="status"
              className="rounded-2xl bg-success-soft p-3 text-base font-bold text-success"
            >
              {note}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={!canSubmit}>
            {busy ? "Creating your account…" : "Create Account →"}
          </Button>
        </form>

        <div className="my-5 text-center text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          or sign up with
        </div>
        <Button variant="outline" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <p className="mt-4 text-center text-base">
          Already have an account?{" "}
          <Link to="/login" className="font-extrabold text-primary">
            Sign in
          </Link>
        </p>
      </Card>

      <Card tone="muted" className="mt-5">
        <CardNote>
          🔒 Your child never needs an email, phone number or password. They learn under your
          guardian account.
        </CardNote>
      </Card>
    </Page>
  );
}
