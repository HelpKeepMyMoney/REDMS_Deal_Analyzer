import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
let db = null;
let auth = null;
let functions = null;

if (projectId) {
  try {
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const app = initializeApp(config);
    db = getFirestore(app);
    auth = getAuth(app);
    functions = getFunctions(app);

    // Use Functions emulator on localhost when VITE_USE_FUNCTIONS_EMULATOR=true.
    // Run: firebase emulators:start --only functions
    // Without this, localhost uses deployed functions (may hit CORS).
    const useEmulator = import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true";
    if (typeof window !== "undefined" && useEmulator && functions) {
      connectFunctionsEmulator(functions, "localhost", 5001);
    }
  } catch (e) {
    console.warn("Firebase init failed", e);
  }
}

export { db, auth, functions };
