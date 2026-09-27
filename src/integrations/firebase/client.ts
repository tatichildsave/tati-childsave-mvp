import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const browserOnly = typeof window !== "undefined";

function requiredEnv(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) throw new Error(`Missing Firebase environment variable: ${name}`);
  return value;
}

export function getFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: requiredEnv("VITE_FIREBASE_API_KEY"),
    authDomain: requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: requiredEnv("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: requiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requiredEnv("VITE_FIREBASE_APP_ID"),
    ...(import.meta.env["VITE_FIREBASE_MEASUREMENT_ID"]
      ? { measurementId: import.meta.env["VITE_FIREBASE_MEASUREMENT_ID"] as string }
      : {}),
  };
}

let firebaseAppInitialized = false;
let firestoreInitialized = false;
let authInitialized = false;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const app = initializeApp(getFirebaseConfig());

  // Connect to emulator if environment variables are set
  // This allows local development without cloud Firebase
  if (browserOnly && !firebaseAppInitialized) {
    const firestoreEmulatorHost = import.meta.env["VITE_FIRESTORE_EMULATOR_HOST"];
    const authEmulatorHost = import.meta.env["VITE_FIREBASE_AUTH_EMULATOR_HOST"];

    if (firestoreEmulatorHost) {
      try {
        const [host, port] = firestoreEmulatorHost.split(":");
        const fs = getFirestore(app);
        connectFirestoreEmulator(fs, host, parseInt(port || "8080"));
        firestoreInitialized = true;
      } catch (error) {
        // Emulator may already be connected, which is fine
        console.debug("Firestore emulator connection info:", error);
      }
    }

    if (authEmulatorHost) {
      try {
        const auth = getAuth(app);
        connectAuthEmulator(auth, `http://${authEmulatorHost}`, {
          disableWarnings: true,
        });
        authInitialized = true;
      } catch (error) {
        // Emulator may already be connected, which is fine
        console.debug("Auth emulator connection info:", error);
      }
    }

    firebaseAppInitialized = true;
  }

  return app;
}

export function getFirebaseAuth(): Auth | null {
  return browserOnly ? getAuth(getFirebaseApp()) : null;
}

export function getFirebaseFirestore(): Firestore | null {
  return browserOnly ? getFirestore(getFirebaseApp()) : null;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  return browserOnly ? getStorage(getFirebaseApp()) : null;
}
