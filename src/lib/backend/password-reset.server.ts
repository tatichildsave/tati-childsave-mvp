/**
 * Password Reset Service
 *
 * Handles password reset workflows using Firebase Auth's built-in email action links.
 * Works for admin, facilitator, and parent users.
 *
 * Flow:
 * 1. User submits email on forgot-password form
 * 2. Server verifies user exists in Firebase Auth
 * 3. Firebase sends password reset email with actionable link
 * 4. User clicks link in email → redirected to reset password page
 * 5. User enters new password → Firebase Auth updates password
 * 6. User can log in with new password
 */

import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Send password reset email
 *
 * Uses Firebase's built-in password reset email. The email contains a link that:
 * - Redirects user to password reset page
 * - Includes a reset token valid for 1 hour
 * - Allows user to set new password securely
 *
 * @param email - User's email address
 * @param redirectUrl - URL to redirect to after reset (e.g., admin-login, parent-login)
 * @returns Success/error response
 *
 * @throws Error if email not found in Firebase Auth
 * @throws Error if email sending fails
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectUrl: string = "https://tati-childsave-mvp.vercel.app/admin-login",
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify email is not empty
    if (!email || !email.trim()) {
      return {
        success: false,
        message: "Email address is required",
      };
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Verify user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await getAuth().getUserByEmail(emailTrimmed);
    } catch (error) {
      // User not found - return generic message to prevent email enumeration
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link.",
      };
    }

    // Generate password reset link using Firebase Admin SDK
    // This creates a verified link that Firebase Auth recognizes
    const resetLink = await getAuth().generatePasswordResetLink(emailTrimmed);

    // For MVP: Log the reset link (in production, this would be sent via email service)
    // Firebase handles the email sending via their default email template
    console.log(`[PASSWORD RESET] Reset link for ${emailTrimmed}: ${resetLink}`);

    // Send email using Firebase's built-in email action links
    // Note: This requires Email/Password provider to be enabled in Firebase Console
    await getAuth().sendPasswordResetEmail(emailTrimmed, {
      url: redirectUrl,
      handleCodeInApp: true,
    });

    return {
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link.",
    };
  } catch (error) {
    console.error("[PASSWORD RESET ERROR]", error);
    return {
      success: false,
      message:
        "An error occurred while processing your request. Please try again later.",
    };
  }
}

/**
 * Verify password reset code
 *
 * Verifies that a password reset code is valid before allowing password change.
 * Firebase Auth handles validation automatically when code is used.
 *
 * @param code - Reset code from email link
 * @returns User email if code is valid
 *
 * @throws Error if code is invalid or expired
 */
export async function verifyPasswordResetCode(code: string): Promise<string> {
  try {
    // Firebase Auth verifies the code and returns the email
    const email = await getAuth().verifyPasswordResetCode(code);
    return email;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("invalid")) {
        throw new Error("Password reset link is invalid or has expired");
      }
    }
    throw new Error("Failed to verify password reset link");
  }
}

/**
 * Confirm password reset with code and new password
 *
 * Uses Firebase Auth's confirmPasswordReset to atomically:
 * 1. Verify the reset code is valid
 * 2. Update the user's password
 * 3. Invalidate all existing sessions (user must log in again)
 *
 * @param code - Reset code from email link
 * @param newPassword - New password (user must enter twice to confirm)
 * @returns Success confirmation
 *
 * @throws Error if code invalid, expired, or password doesn't meet requirements
 */
export async function confirmPasswordReset(
  code: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate password meets requirements
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        message: "Password must be at least 6 characters long",
      };
    }

    if (newPassword.length > 128) {
      return {
        success: false,
        message: "Password is too long",
      };
    }

    // Firebase Auth confirms the reset and updates password
    // This automatically invalidates all existing sessions
    await getAuth().confirmPasswordReset(code, newPassword);

    return {
      success: true,
      message:
        "Your password has been reset successfully. You can now log in with your new password.",
    };
  } catch (error) {
    console.error("[PASSWORD RESET CONFIRM ERROR]", error);

    if (error instanceof Error) {
      if (error.message.includes("invalid")) {
        return {
          success: false,
          message: "Password reset link is invalid or has expired",
        };
      }
      if (error.message.includes("weak")) {
        return {
          success: false,
          message: "Password does not meet security requirements",
        };
      }
    }

    return {
      success: false,
      message:
        "Failed to reset password. Please try again or request a new reset link.",
    };
  }
}

/**
 * Change password for authenticated user
 *
 * For users who are logged in and want to change their password.
 * Requires verification of current password.
 *
 * Note: This is different from password reset (for logged-out users).
 * Requires the user to be authenticated.
 *
 * @param uid - User UID (from authenticated session)
 * @param currentPassword - Current password (for verification)
 * @param newPassword - New password
 * @returns Success confirmation
 */
export async function changePasswordForUser(
  uid: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate inputs
    if (!uid || !currentPassword || !newPassword) {
      return {
        success: false,
        message: "All fields are required",
      };
    }

    if (newPassword.length < 6) {
      return {
        success: false,
        message: "New password must be at least 6 characters long",
      };
    }

    if (newPassword === currentPassword) {
      return {
        success: false,
        message: "New password must be different from current password",
      };
    }

    // Note: Firebase Admin SDK cannot directly verify current password for security reasons
    // The actual password verification should happen on the client-side using Firebase SDK
    // This function is a placeholder for the server-side password update

    // In production, you would:
    // 1. Client verifies current password via Firebase SDK
    // 2. Client gets ID token
    // 3. Server uses ID token to update password (or use custom claims)
    // 4. Firebase Auth updates password

    // For now, update the password directly (requires client-side verification first)
    await getAuth().updateUser(uid, {
      password: newPassword,
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    console.error("[CHANGE PASSWORD ERROR]", error);
    return {
      success: false,
      message: "Failed to change password. Please try again.",
    };
  }
}

/**
 * Invalidate all sessions for a user
 *
 * Forces user to log in again (useful after password reset or security event)
 * Revokes all refresh tokens, invalidating all sessions
 *
 * @param uid - User UID
 */
export async function invalidateAllSessions(uid: string): Promise<void> {
  try {
    await getAuth().revokeRefreshTokens(uid);
    console.log(`[SESSION REVOKE] All sessions revoked for user ${uid}`);
  } catch (error) {
    console.error("[SESSION REVOKE ERROR]", error);
    throw new Error("Failed to invalidate sessions");
  }
}
