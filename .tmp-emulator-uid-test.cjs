const { initializeApp } = require("firebase/app");
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
} = require("firebase/firestore");

(async () => {
  console.log("=== Firebase emulator UID/write/read test ===");
  const app = initializeApp({
    apiKey: "demo-api-key",
    authDomain: "demo-tati.firebaseapp.com",
    projectId: "demo-tati",
    appId: "demo-app-id",
  });
  console.log("Initialized Firebase app:", app.name, "projectId:", app.options.projectId);
  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.log("Connected Auth emulator: http://127.0.0.1:9099");
  console.log("Connected Firestore emulator: 127.0.0.1:8080");

  let uid;
  try {
    console.log("\n--- Creating Auth user ---");
    const credential = await createUserWithEmailAndPassword(auth, "test@example.com", "test123");
    uid = credential.user.uid;
    console.log("Auth user created successfully");
    console.log("ACTUAL UID:", uid);
  } catch (error) {
    console.error("AUTH ERROR:", error);
  }
  if (!uid) {
    console.error("Cannot perform Firestore test because no UID was obtained.");
    process.exitCode = 1;
    return;
  }

  const ref = doc(db, "uid-test", uid);
  try {
    console.log("\n--- Writing Firestore document ---");
    await setDoc(ref, { uid, email: "test@example.com", test: true });
    console.log("WRITE SUCCESS:", ref.path);
  } catch (error) {
    console.error("FIRESTORE WRITE ERROR:", error);
    process.exitCode = 1;
  }
  try {
    console.log("\n--- Reading Firestore document ---");
    const snapshot = await getDoc(ref);
    console.log("READ SUCCESS; exists:", snapshot.exists());
    console.log("READ DATA:", snapshot.exists() ? snapshot.data() : null);
  } catch (error) {
    console.error("FIRESTORE READ ERROR:", error);
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error("UNHANDLED ERROR:", error);
  process.exitCode = 1;
});
