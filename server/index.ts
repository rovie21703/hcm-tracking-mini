// ─────────────────────────────────────────────────────────────────────────
//  Mini HCM — Node.js + Express backend
//
//  Responsibilities (per the PDF tech stack):
//   • Record punch-in / punch-out into the Firestore `attendance` collection.
//   • Compute regular hours, OT, night differential, lateness, and undertime.
//   • Persist aggregated results into the `dailySummary` collection.
//   • Serve reports (all users, all punches, per-user punches, summaries).
//
//  Run:  cd server && npm install && npm run dev
//  Default port: 4000 (override with PORT env var).
// ─────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./firebaseAdmin.js";
import { computeMetrics, type Punch, type Schedule } from "./compute.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const DEFAULT_SCHEDULE: Schedule = { start: "09:00", end: "18:00" };

// Recompute + persist the daily summary for a punch.
async function writeDailySummary(rec: Punch, schedule: Schedule) {
  const m = computeMetrics(rec, schedule);
  const id = `${rec.userId}_${rec.date}`;
  await db.collection("dailySummary").doc(id).set({
    id, userId: rec.userId, date: rec.date, updatedAt: new Date().toISOString(), ...m,
  });
  return m;
}

async function getSchedule(userId: string): Promise<Schedule> {
  const snap = await db.collection("users").doc(userId).get();
  const data = snap.data();
  return (data?.schedule as Schedule) || DEFAULT_SCHEDULE;
}

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "mini-hcm-server" }));

// ── Punch In ──────────────────────────────────────────────────────────────
app.post("/api/punch-in", async (req, res) => {
  try {
    const { userId, date } = req.body as { userId: string; date: string };
    if (!userId || !date) return res.status(400).json({ error: "userId and date are required" });
    const punchIn = new Date().toISOString();
    const ref = await db.collection("attendance").add({ userId, date, punchIn, punchOut: null });
    res.json({ id: ref.id, userId, date, punchIn, punchOut: null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Punch Out (computes metrics + writes daily summary) ──────────────────────
app.post("/api/punch-out", async (req, res) => {
  try {
    const { punchId } = req.body as { punchId: string };
    if (!punchId) return res.status(400).json({ error: "punchId is required" });
    const ref = db.collection("attendance").doc(punchId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "punch not found" });

    const rec = { id: snap.id, ...(snap.data() as Omit<Punch, "id">) };
    const punchOut = new Date().toISOString();
    await ref.update({ punchOut });

    const schedule = await getSchedule(rec.userId);
    const metrics = await writeDailySummary({ ...rec, punchOut }, schedule);
    res.json({ ...rec, punchOut, metrics });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Edit a punch (admin) ────────────────────────────────────────────────────
app.put("/api/punch/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { punchIn, punchOut } = req.body as { punchIn: string; punchOut: string | null };
    const ref = db.collection("attendance").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "punch not found" });

    await ref.update({ punchIn, punchOut: punchOut || null });
    const rec = { id, ...(snap.data() as Omit<Punch, "id">), punchIn, punchOut: punchOut || null };
    const schedule = await getSchedule(rec.userId);
    const metrics = await writeDailySummary(rec, schedule);
    res.json({ ...rec, metrics });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Delete a punch (admin) ──────────────────────────────────────────────────
app.delete("/api/punch/:id", async (req, res) => {
  try {
    const ref = db.collection("attendance").doc(req.params.id);
    const snap = await ref.get();
    const rec = snap.data() as Punch | undefined;
    await ref.delete();
    // Remove the matching daily summary so aggregates don't go stale.
    if (rec) await db.collection("dailySummary").doc(`${rec.userId}_${rec.date}`).delete();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Reports ─────────────────────────────────────────────────────────────────
app.get("/api/users", async (_req, res) => {
  try {
    const snap = await db.collection("users").get();
    res.json(snap.docs.map(d => d.data()));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/punches", async (_req, res) => {
  try {
    const snap = await db.collection("attendance").orderBy("date", "desc").get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/punches/:userId", async (req, res) => {
  try {
    const snap = await db.collection("attendance").where("userId", "==", req.params.userId).get();
    const punches = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Punch, "id">) }))
      .sort((a, b) => b.date.localeCompare(a.date));
    res.json(punches);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/summary", async (_req, res) => {
  try {
    const snap = await db.collection("dailySummary").get();
    res.json(snap.docs.map(d => d.data()));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Mini HCM server running on http://localhost:${PORT}`);
});
