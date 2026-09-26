import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
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

export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
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
