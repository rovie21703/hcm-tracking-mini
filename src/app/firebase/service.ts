import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc,
  query, where, getDocs, orderBy,
} from "firebase/firestore";
import { auth, db } from "./config";
import { computeMetrics } from "./compute";
import { api, useServer } from "./api";
import type { UserProfile, Punch, DailySummary } from "./types";

// ── Auth ──────────────────────────────────────────────────────────────────
export async function registerUser(
  name: string, email: string, password: string,
  schedule: { start: string; end: string } = { start: "09:00", end: "18:00" },
  role: "admin" | "employee" = "employee",
): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: UserProfile = {
    id: cred.user.uid, name, email, role,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    schedule,
  };
  await setDoc(doc(db, "users", cred.user.uid), profile);
  return profile;
}

export async function loginUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  if (useServer) return api.get("/api/users");
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => d.data() as UserProfile);
}

// ── Attendance / Punches ────────────────────────────────────────────────────
// When an Express backend is configured (VITE_API_BASE), punch operations and
// metric computation happen server-side. Otherwise they run against Firestore
// directly from the browser.
export async function punchIn(userId: string, date: string): Promise<Punch> {
  if (useServer) return api.post("/api/punch-in", { userId, date });
  const punchInTime = new Date().toISOString();
  const ref = await addDoc(collection(db, "attendance"), { userId, date, punchIn: punchInTime, punchOut: null });
  return { id: ref.id, userId, date, punchIn: punchInTime, punchOut: null };
}

export async function punchOut(punch: Punch, schedule: { start: string; end: string }): Promise<void> {
  if (useServer) { await api.post("/api/punch-out", { punchId: punch.id }); return; }
  const punchOutTime = new Date().toISOString();
  await updateDoc(doc(db, "attendance", punch.id), { punchOut: punchOutTime });
  // Aggregate into the dailySummary collection.
  await writeDailySummary({ ...punch, punchOut: punchOutTime }, schedule);
}

export async function updatePunch(
  id: string, punchIn: string, punchOut: string | null,
  rec: Punch, schedule: { start: string; end: string },
): Promise<void> {
  if (useServer) { await api.put(`/api/punch/${id}`, { punchIn, punchOut }); return; }
  await updateDoc(doc(db, "attendance", id), { punchIn, punchOut });
  await writeDailySummary({ ...rec, punchIn, punchOut }, schedule);
}

export async function deletePunch(rec: Punch): Promise<void> {
  if (useServer) { await api.del(`/api/punch/${rec.id}`); return; }
  await deleteDoc(doc(db, "attendance", rec.id));
  // Remove the matching daily summary so aggregates don't go stale.
  await deleteDoc(doc(db, "dailySummary", `${rec.userId}_${rec.date}`));
}

export async function getAllPunches(): Promise<Punch[]> {
  if (useServer) return api.get("/api/punches");
  const snap = await getDocs(query(collection(db, "attendance"), orderBy("date", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Punch, "id">) }));
}

export async function getUserPunches(userId: string): Promise<Punch[]> {
  if (useServer) return api.get(`/api/punches/${userId}`);
  const snap = await getDocs(query(collection(db, "attendance"), where("userId", "==", userId)));
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Punch, "id">) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ── Daily Summary ───────────────────────────────────────────────────────────
async function writeDailySummary(rec: Punch, schedule: { start: string; end: string }): Promise<void> {
  const m = computeMetrics(rec, schedule);
  const id = `${rec.userId}_${rec.date}`;
  const summary: DailySummary = {
    id, userId: rec.userId, date: rec.date, updatedAt: new Date().toISOString(), ...m,
  };
  await setDoc(doc(db, "dailySummary", id), summary);
}

export async function getDailySummaries(): Promise<DailySummary[]> {
  const snap = await getDocs(collection(db, "dailySummary"));
  return snap.docs.map(d => d.data() as DailySummary);
}
