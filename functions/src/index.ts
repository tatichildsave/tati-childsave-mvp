import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export admin functions
export { createAdminUser, createFacilitatorUser, assignSchoolAdmin } from "./admin";
