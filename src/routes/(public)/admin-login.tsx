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
import { createParentSessionFn } from "@/lib/backend/firebase/family.functions";

export const Route = createFileRoute("/(public)/admin-login")({
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
            const roles = userDocSnap.data()?.["roles"] as string[] | undefined;
            if (Array.isArray(roles) && roles.includes("admin")) {
              try {
                const idToken = await user.getIdToken();
                await createParentSessionFn({ data: { idToken } });
                navigate({ to: "/admin", replace: true });
                return;
              } catch (sessionError) {
                console.error("[Admin Login] Failed to create session cookie in effect:", sessionError);
                // Fall through to setChecking(false) to show error on page
              }
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
        const msg = "Authentication not available. Please reload the page.";
        console.error("[Admin Login] Firebase Auth not initialized:", msg);
        setError(msg);
        setBusy(false);
        return;
      }

      console.log("[Admin Login] Attempting sign in with:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log("[Admin Login] Sign in successful, UID:", userCredential.user.uid);

      // Verify admin role
      const db = getFirebaseFirestore();
      console.log("[Admin Login] Firestore available:", !!db);
      
      if (db) {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        console.log("[Admin Login] Checking admin role for UID:", userCredential.user.uid);
        
        const userDocSnap = await getDoc(userDocRef);
        console.log("[Admin Login] User doc exists:", userDocSnap.exists());
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log("[Admin Login] User data:", userData);
          
          const roles = userData?.["roles"] as string[] | undefined;
          console.log("[Admin Login] User roles:", roles);
          
          if (Array.isArray(roles) && roles.includes("admin")) {
            console.log("[Admin Login] Admin role confirmed, creating session cookie");
            try {
              const idToken = await userCredential.user.getIdToken();
              await createParentSessionFn({ data: { idToken } });
              console.log("[Admin Login] Session cookie created, navigating to /admin");
              navigate({ to: "/admin", replace: true });
              return;
            } catch (sessionError) {
              console.error("[Admin Login] Failed to create session cookie:", sessionError);
              setError("Failed to create admin session. Please try signing in again.");
              setBusy(false);
              return;
            }
          } else {
            console.log("[Admin Login] User exists but does not have admin role");
          }
        } else {
          console.log("[Admin Login] User document does not exist in Firestore");
        }
      } else {
        console.log("[Admin Login] Firestore not available");
      }

      setError("You do not have admin privileges. Please contact support.");
      setBusy(false);
    } catch (signInError) {
      const message = signInError instanceof Error ? signInError.message.toLowerCase() : "";
      console.error("[Admin Login] Sign in error:", signInError);
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
          const roles = userDocSnap.data()?.["roles"] as string[] | undefined;
          if (Array.isArray(roles) && roles.includes("admin")) {
            console.log("[Admin Login] Admin role confirmed (Google), creating session cookie");
            try {
              const idToken = await result.user.getIdToken();
              await createParentSessionFn({ data: { idToken } });
              console.log("[Admin Login] Session cookie created, navigating to /admin");
              navigate({ to: "/admin", replace: true });
              return;
            } catch (sessionError) {
              console.error("[Admin Login] Failed to create session cookie:", sessionError);
              setError("Failed to create admin session. Please try signing in again.");
              return;
            }
          }
        }
      }

      setError("You do not have admin privileges. Please contact support.");
    } catch (googleError) {
      const message = googleError instanceof Error ? googleError.message.toLowerCase() : "";
      if (!message.includes("popup-closed")) {
        setError("We couldn't sign you in with Google right now. Please try again.");
      }
    }
  }

  if (checking) {
    return (
      <Page>
        <PageHeader title="Admin Sign In" description="Verifying your credentials..." />
        <Card>
          <p className="text-base font-bold text-center text-muted-foreground">
            Checking credentials…
          </p>
        </Card>
      </Page>
    );
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
            <Button variant="primary" onClick={handleSubmit} disabled={busy} className="w-full">
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Or sign in with Google</p>
            <Button variant="secondary" onClick={handleGoogle} disabled={busy} className="w-full">
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
