/**
 * Password Reset Functions (Server Functions)
 *
 * Exposes password reset functionality as TanStack Server Functions
 * Works for admin, parent, and facilitator users
 *
 * Endpoints:
 * - requestPasswordReset: Send reset email
 * - verifyPasswordResetCode: Validate reset code
 * - confirmPasswordReset: Complete password reset with new password
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Request password reset (send reset email)
 *
 * Public endpoint (no auth required)
 * User provides email, Firebase sends reset link
 */
const requestPasswordResetInput = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "parent", "facilitator"]),
});

export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .validator(requestPasswordResetInput)
  .handler(async ({ data }) => {
    const { sendPasswordResetEmail } = await import("./password-reset.server");
    
    const redirectUrls: Record<string, string> = {
      admin: "https://tati-childsave-mvp.vercel.app/admin-login",
      parent: "https://tati-childsave-mvp.vercel.app/parent-login",
      facilitator: "https://tati-childsave-mvp.vercel.app/academy/login",
    };

    const redirectUrl = redirectUrls[data.role] || redirectUrls.admin;
    return await sendPasswordResetEmail(data.email, redirectUrl);
  });

/**
 * Verify password reset code
 *
 * Called when user clicks reset link in email
 * Validates code before showing password reset form
 */
const verifyPasswordResetCodeInput = z.object({
  code: z.string().min(1, "Reset code required"),
});

export const verifyPasswordResetCodeFn = createServerFn({ method: "POST" })
  .validator(verifyPasswordResetCodeInput)
  .handler(async ({ data }) => {
    const { verifyPasswordResetCode } = await import("./password-reset.server");
    
    try {
      const email = await verifyPasswordResetCode(data.code);
      return {
        success: true,
        email,
        message: "Reset code is valid",
      };
    } catch (error) {
      return {
        success: false,
        email: null,
        message: error instanceof Error ? error.message : "Failed to verify reset code",
      };
    }
  });

/**
 * Confirm password reset with code and new password
 *
 * Final step: User submits new password
 * Firebase Auth validates code and updates password atomically
 */
const confirmPasswordResetInput = z.object({
  code: z.string().min(1, "Reset code required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const confirmPasswordResetFn = createServerFn({ method: "POST" })
  .validator(confirmPasswordResetInput)
  .handler(async ({ data }) => {
    const { confirmPasswordReset } = await import("./password-reset.server");
    
    // Additional password validation on server
    if (data.newPassword.length > 128) {
      return {
        success: false,
        message: "Password is too long",
      };
    }

    // Prevent common weak passwords
    const weakPasswords = [
      "123456",
      "password",
      "qwerty",
      "abc123",
      "111111",
      "000000",
    ];
    if (weakPasswords.includes(data.newPassword.toLowerCase())) {
      return {
        success: false,
        message: "Password is too weak. Please choose a stronger password.",
      };
    }

    return await confirmPasswordReset(data.code, data.newPassword);
  });
