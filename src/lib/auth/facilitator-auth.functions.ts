import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseAuth, getFirebaseFirestore } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export interface FacilitatorSession {
  uid: string;
  email: string;
  displayName: string;
  isFacilitator: boolean;
}

/**
 * Check if the current user has facilitator role.
 * Checks the Firestore /users/{uid} document for facilitator role.
 */
export async function checkFacilitatorStatus(userId: string): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return false;

    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) return false;

    const roles = userDocSnap.data()?.["roles"] as string[] | undefined;
    return Array.isArray(roles) && roles.includes("facilitator");
  } catch (error) {
    console.error("Error checking facilitator status:", error);
    return false;
  }
}

/**
 * Get current facilitator session info if authenticated.
 * Returns null if not authenticated or not a facilitator.
 */
export async function getFacilitatorSession(): Promise<FacilitatorSession | null> {
  try {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    
    if (!user) return null;

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
 * Logout current facilitator.
 */
export async function logoutFacilitator(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}
