import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadCredential(): admin.credential.Credential {
  // 1. Explicit env var pointing at a key file.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }
  // 2. Local serviceAccountKey.json next to this file.
  try {
    const raw = readFileSync(join(__dirname, "serviceAccountKey.json"), "utf-8");
    return admin.credential.cert(JSON.parse(raw));
  } catch {
    throw new Error(
      "No Firebase service account found. Place serviceAccountKey.json in /server " +
      "or set GOOGLE_APPLICATION_CREDENTIALS. See server/firebaseAdmin.ts for details."
    );
  }
}

admin.initializeApp({ credential: loadCredential() });

export const db = admin.firestore();
