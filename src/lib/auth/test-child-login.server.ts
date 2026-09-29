/**
 * Test-Only Child Login (Firestore-based)
 * ========================================
 *
 * TEMPORARY TEST UTILITY - LOCAL EMULATOR ONLY
 * For H3.4 journey testing when Firestore fixtures are used
 *
 * This bypasses the normal Supabase auth path and directly validates
 * against Firestore test fixtures. Remove after H3.4 testing completes.
 *
 * Safety checks:
 * - Only allows login if FIRESTORE_EMULATOR_HOST is set
 * - Never attempts production connections
 * - Clearly marked as test-only
 */

import { createServerFn } from "@tanstack/react-start";
import { setCookie, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import { randomBytes, createHash } from "crypto";

const COOKIE_NAME = "tati_child_session";

// Only enable in emulator mode
const isEmulatorOnly = () => !!process.env["FIRESTORE_EMULATOR_HOST"];

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const testLoginInput = z.object({
  tatiId: z.string().trim().toUpperCase(),
  pin: z.string().regex(/^\d{4,6}$/),
});

/**
 * Test-only Firestore-based child login
 * Creates session directly in Firestore child_sessions collection
 */
export const testChildLogin = createServerFn({ method: "POST" })
  .validator(testLoginInput)
  .handler(async ({ data }) => {
    if (!isEmulatorOnly()) {
      throw new Error("Test login only available in emulator mode");
    }

    const db = getFirebaseAdminDb();

    // Find child by TATI ID
    const childSnapshot = await db
      .collectionGroup("children")
      .where("tatiId", "==", data.tatiId)
      .limit(1)
      .get();

    if (childSnapshot.empty) {
      throw new Error("That TATI ID or PIN could not be verified.");
    }

    const childDoc = childSnapshot.docs[0];
    const childId = childDoc.id;
    const familyId = childDoc.data().familyId;

    // For test fixtures, PIN is stored in a separate test-data document
    // In real system this would be in Supabase
    const testDataDoc = await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("testData")
      .doc("credentials")
      .get();

    if (!testDataDoc.exists) {
      throw new Error("Test credentials not found. Please recreate test fixtures.");
    }

    // Simple PIN verification for test (not production-grade)
    const testData = testDataDoc.data();
    if (testData?.testPin !== data.pin) {
      throw new Error("That TATI ID or PIN could not be verified.");
    }

    // Create session in Firestore
    const token = randomBytes(32).toString("base64url");
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);

    const sessionRef = await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("sessions")
      .add({
        tokenHash: sessionTokenHash(token),
        createdAt,
        expiresAt,
        revokedAt: null,
        isTestSession: true, // Mark as test
      });

    // Set session cookie
    setCookie(COOKIE_NAME, token, cookieOptions(30 * 60));

    // Return child info
    const childData = childDoc.data();
    return {
      profile: {
        id: childId,
        tati_id: data.tatiId,
        name: childData.name,
        age: childData.age,
        avatar: childData.avatar,
        tier: childData.tier,
        curriculum_level: childData.curriculumLevel,
      },
    };
  });

/**
 * Test-only helper: Create test credentials document
 * Used by test fixture creation script
 */
export async function createTestCredentials(
  familyId: string,
  childId: string,
  tatiId: string,
  pin: string,
) {
  if (!isEmulatorOnly()) {
    throw new Error("Test credential creation only in emulator mode");
  }

  const db = getFirebaseAdminDb();

  await db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .collection("testData")
    .doc("credentials")
    .set({
      tatiId,
      testPin: pin,
      createdForTesting: new Date().toISOString(),
    });
}
