import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseAuth, getFirebaseFirestore } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import {
  clearParentSessionFn,
  createParentSessionFn,
} from "@/lib/backend/firebase/family.functions";

export interface FacilitatorSession {
  uid: string;
  email: string;
  displayName: string;
  isFacilitator: boolean;
}

/**
 * Read the roles on /users/{uid}. Returns [] when the record is missing or unreadable.
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return [];
    const snap = await getDoc(doc(db, "users", userId));
    const roles = snap.exists() ? (snap.data()?.["roles"] as unknown) : undefined;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === "string") : [];
  } catch (error) {
    console.error("Error reading user roles:", error);
    return [];
  }
}

/**
 * Check if the current user has facilitator role.
 * Checks the Firestore /users/{uid} document for facilitator role.
 */
export async function checkFacilitatorStatus(userId: string): Promise<boolean> {
  return (await getUserRoles(userId)).includes("facilitator");
}

/**
 * Get current facilitator session info if authenticated.
 * Waits for Firebase Auth to restore a persisted login before deciding.
 * Refreshes the ID token to ensure validity for server functions.
 * Returns null if not authenticated or not a facilitator.
 */
export async function getFacilitatorSession(): Promise<FacilitatorSession | null> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) return null;
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) return null;

    // Refresh token to ensure it's still valid (prevents auth/invalid-credential errors)
    try {
      await user.getIdToken(true); // Force refresh
    } catch (tokenError) {
      console.error("Error refreshing ID token:", tokenError);
      // Continue anyway - the user might still be valid
    }

    const isFacilitator = await checkFacilitatorStatus(user.uid);
    if (!isFacilitator) return null;

    return {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? user.email ?? "Facilitator",
      isFacilitator: true,
    };
  } catch (error) {
    console.error("Error getting facilitator session:", error);
    return null;
  }
}

/**
 * Login facilitator with email and password.
 * After the role check, creates the same HTTP-only server session cookie used by the
 * admin and parent portals so facilitator server functions can verify the caller.
 */
export async function loginFacilitator(
  email: string,
  password: string,
): Promise<FacilitatorSession | null> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) return null;

    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);

    // Verify facilitator role
    const isFacilitator = await checkFacilitatorStatus(userCredential.user.uid);
    if (!isFacilitator) {
      // Sign them out immediately if they don't have facilitator role
      await signOut(auth);
      return null;
    }

    try {
      const idToken = await userCredential.user.getIdToken();
      await createParentSessionFn({ data: { idToken } });
    } catch (error) {
      // Without a server session, server-verified features (e.g. class scheduling) won't work.
      console.error("Error creating facilitator server session:", error);
      await signOut(auth);
      return null;
    }

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email ?? "",
      displayName: userCredential.user.displayName ?? userCredential.user.email ?? "Facilitator",
      isFacilitator: true,
    };
  } catch (error) {
    console.error("Error logging in facilitator:", error);
    return null;
  }
}

/**
 * Logout current facilitator: clears the server session cookie, then signs out of Firebase.
 */
export async function logoutFacilitator(): Promise<void> {
  try {
    await clearParentSessionFn({ data: undefined });
  } catch (error) {
    console.error("Error clearing facilitator server session:", error);
  }
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}
