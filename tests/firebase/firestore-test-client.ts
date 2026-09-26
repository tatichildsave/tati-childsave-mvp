/**
 * Firestore Emulator Test Helper
 *
 * Provides utilities to test Firestore security rules by simulating
 * authenticated requests as different users with different roles.
 */

import {
  Firestore,
  doc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  DocumentReference,
  QueryConstraint,
  RpcStatus,
} from "firebase/firestore";
import { Auth, signInWithEmailAndPassword, signOut, UserCredential } from "firebase/auth";

export type OperationResult<T = unknown> =
  { success: true; data: T } | { success: false; error: RpcStatus | Error | string };

/**
 * User context for testing
 */
export interface TestUserContext {
  uid: string;
  email: string;
  displayName: string;
  roles: string[];
}

/**
 * Firestore test client for a specific user
 */
export class FirestoreTestClient {
  private currentUser: UserCredential | null = null;

  constructor(
    private db: Firestore,
    private auth: Auth,
  ) {}

  /**
   * Sign in as a user
   */
  async signInAs(uid: string, email: string, password: string = "testpassword123"): Promise<void> {
    try {
      this.currentUser = await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      // User might not exist yet, which is fine for testing
      // Log the error for debugging but don't throw
      console.warn(`Failed to sign in user ${uid}:`, error);
      this.currentUser = null;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    if (this.currentUser) {
      await signOut(this.auth);
      this.currentUser = null;
    }
  }

  /**
   * Get a document with permission error handling
   */
  async getDoc<T = unknown>(path: string): Promise<OperationResult<T | null>> {
    try {
      const docRef = doc(this.db, path);
      const snapshot = await getDoc(docRef);
      return {
        success: true,
        data: snapshot.exists() ? (snapshot.data() as T) : null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }

  /**
   * Query documents with permission error handling
   */
  async query<T = unknown>(
    collectionPath: string,
    ...constraints: QueryConstraint[]
  ): Promise<OperationResult<T[]>> {
    try {
      const coll = collection(this.db, collectionPath);
      const q = query(coll, ...constraints);
      const snapshot = await getDocs(q);
      return {
        success: true,
        data: snapshot.docs.map((doc) => doc.data() as T),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }

  /**
   * Set a document with permission error handling
   */
  async setDoc<T extends Record<string, unknown>>(
    path: string,
    data: T,
  ): Promise<OperationResult<void>> {
    try {
      const docRef = doc(this.db, path);
      await setDoc(docRef, data, { merge: false });
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }

  /**
   * Update a document with permission error handling
   */
  async updateDoc<T extends Record<string, unknown>>(
    path: string,
    data: T,
  ): Promise<OperationResult<void>> {
    try {
      const docRef = doc(this.db, path);
      await updateDoc(docRef, data);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }

  /**
   * Delete a document with permission error handling
   */
  async deleteDoc(path: string): Promise<OperationResult<void>> {
    try {
      const docRef = doc(this.db, path);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }

  /**
   * Batch write with permission error handling
   */
  async batch(operations: (batch: typeof writeBatch) => void): Promise<OperationResult<void>> {
    try {
      const batch = writeBatch(this.db);
      operations(batch);
      await batch.commit();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }
}

/**
 * Test assertion helpers for permission testing
 */
export const permissionAssertions = {
  /**
   * Assert that an operation was allowed
   */
  async expectAllowed<T>(result: OperationResult<T>): Promise<T | null> {
    if (!result.success) {
      throw new Error(`Expected operation to be allowed, but got error: ${result.error}`);
    }
    return result.data ?? null;
  },

  /**
   * Assert that an operation was denied (permission error)
   */
  async expectDenied(result: OperationResult): Promise<void> {
    if (result.success) {
      throw new Error(`Expected operation to be denied, but it was allowed`);
    }

    const error = result.error;
    const errorStr = String(error);

    if (!errorStr.includes("permission") && !errorStr.includes("denied")) {
      throw new Error(
        `Expected permission/denied error, but got: ${error}. This might be a different type of error.`,
      );
    }
  },

  /**
   * Assert that an operation resulted in a specific error
   */
  async expectError(result: OperationResult, expectedMessage: string): Promise<void> {
    if (result.success) {
      throw new Error(`Expected operation to fail, but it was allowed`);
    }

    const error = result.error;
    const errorStr = String(error).toLowerCase();

    if (!errorStr.includes(expectedMessage.toLowerCase())) {
      throw new Error(`Expected error containing "${expectedMessage}", but got: ${error}`);
    }
  },
};
