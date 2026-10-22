/**
 * Client-side password reset helpers for Admin, Parent and TATI Academy.
 *
 * Uses the Firebase Auth client SDK, the supported flow for email-link
 * password resets. No admin credentials are involved.
 */
import {
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
} from "firebase/auth";
import { getFirebaseAuth } from "../../integrations/firebase/client";

export const RESET_REQUEST_SENT_MESSAGE =
  "If an account exists with this email, you will receive a password reset link.";

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Password reset is only available in the browser.");
  }
  return auth;
}

function errorCodeOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

/**
 * Sends the reset email. The link returns to `resetPath` on this site.
 * Unknown accounts get the same message to avoid revealing which emails exist.
 */
export async function requestPasswordReset(
  email: string,
  resetPath: string,
): Promise<string> {
  const auth = requireAuth();
  try {
    await sendPasswordResetEmail(auth, email.trim(), {
      url: `${window.location.origin}${resetPath}`,
      handleCodeInApp: true,
    });
    return RESET_REQUEST_SENT_MESSAGE;
  } catch (error) {
    switch (errorCodeOf(error)) {
      case "auth/invalid-email":
        throw new Error("Please enter a valid email address.");
      case "auth/too-many-requests":
        throw new Error("Too many attempts. Please wait a few minutes and try again.");
      case "auth/network-request-failed":
        throw new Error("Network error. Check your connection and try again.");
      case "auth/unauthorized-continue-uri":
        throw new Error(
          "This site is not authorised for password reset. Please contact your administrator.",
        );
      case "auth/user-not-found":
        return RESET_REQUEST_SENT_MESSAGE;
      default:
        throw new Error("We could not send the reset email. Please try again.");
    }
  }
}

/** Checks the code from the email link and returns the account email. */
export async function verifyResetLink(oobCode: string): Promise<string> {
  const auth = requireAuth();
  try {
    return await verifyPasswordResetCode(auth, oobCode);
  } catch {
    throw new Error("This reset link is invalid or has expired. Please request a new one.");
  }
}

/** Sets the new password for the account the code belongs to. */
export async function completePasswordReset(
  oobCode: string,
  newPassword: string,
): Promise<void> {
  const auth = requireAuth();
  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
  } catch (error) {
    if (errorCodeOf(error) === "auth/weak-password") {
      throw new Error("Password must be at least 6 characters.");
    }
    throw new Error("This reset link is invalid or has expired. Please request a new one.");
  }
}
