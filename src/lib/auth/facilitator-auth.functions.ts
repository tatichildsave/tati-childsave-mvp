import { supabase } from "@/integrations/supabase/client";
import { getFirebaseFirestore, getFirebaseAuth } from "@/integrations/firebase/client";
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
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const isFacilitator = await checkFacilitatorStatus(data.user.id);
    if (!isFacilitator) return null;

    return {
      uid: data.user.id,
      email: data.user.email ?? "",
      displayName:
        (data.user.user_metadata?.["full_name"] as string) ?? data.user.email ?? "Facilitator",
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session) return null;

    // Verify facilitator role
    const isFacilitator = await checkFacilitatorStatus(data.user.id);
    if (!isFacilitator) {
      // Sign them out immediately if they don't have facilitator role
      await supabase.auth.signOut();
      return null;
    }

    return {
      uid: data.user.id,
      email: data.user.email ?? "",
      displayName:
        (data.user.user_metadata?.["full_name"] as string) ?? data.user.email ?? "Facilitator",
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
  await supabase.auth.signOut();
}
