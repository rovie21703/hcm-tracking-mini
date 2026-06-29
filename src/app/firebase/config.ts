// ─────────────────────────────────────────────────────────────────────────
//  FIREBASE CONFIGURATION
//  ───────────────────────
//  1. Go to https://console.firebase.google.com and create a project.
//  2. Enable Authentication → Sign-in method → Email/Password.
//  3. Create a Firestore Database (start in test mode for development).
//  4. In Project Settings → General → "Your apps", register a Web app and
//     copy its config values into the object below.
//
//  That's it — paste your config and the whole system is ready to go.
// ─────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDumdcsLZMSY8AWdi1ozjqxidBm2fiapIo",
  authDomain: "mini-hcm-a572e.firebaseapp.com",
  projectId: "mini-hcm-a572e",
  storageBucket: "mini-hcm-a572e.firebasestorage.app",
  messagingSenderId: "1013264460787",
  appId: "1:1013264460787:web:1b5f894495ece087610086",
  measurementId: "G-XY0DDLP3VX",
};

// True only once real credentials are pasted above. The UI uses this to show
// a friendly setup banner instead of crashing when Firebase isn't configured.
export const isFirebaseConfigured =
  firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
