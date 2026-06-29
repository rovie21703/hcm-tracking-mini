import type { Punch, Metrics } from "./types";

export function toMins(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function toHrs(m: number) { return Math.round((m / 60) * 100) / 100; }
export function fmtHrs(h: number) { return h.toFixed(2) + "h"; }
export function fmtMins(m: number) {
  if (m <= 0) return "—";
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
export function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
export function todayStr() { return new Date().toISOString().split("T")[0]; }

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday dates for the week containing `ref` (defaults to today). */
export function getWeekDates(ref: Date = new Date()): string[] {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun … 6 = Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i);
    return localDateStr(cur);
  });
}

export function fmtWeekRange(dates: string[]): string {
  const start = new Date(dates[0] + "T00:00:00");
  const end = new Date(dates[dates.length - 1] + "T00:00:00");
  const startFmt = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endFmt = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startFmt} – ${endFmt}`;
}

// Minutes of work that fall in the night-differential window (22:00–06:00).
function ndMins(startM: number, endM: number): number {
  let nd = 0;
  if (endM > 1320) nd += Math.min(endM, 1440) - Math.max(startM, 1320);
  if (startM < 360) nd += Math.min(endM, 360) - startM;
  return Math.max(0, nd);
}

export function computeMetrics(rec: Punch, schedule: { start: string; end: string }): Metrics {
  const empty: Metrics = { regularHours: 0, otHours: 0, ndHours: 0, lateMinutes: 0, undertimeMinutes: 0, totalHours: 0 };
  if (!rec.punchOut) return empty;
  const shiftS = toMins(schedule.start);
  const shiftE = toMins(schedule.end);
  const sched = shiftE - shiftS;
  const inD = new Date(rec.punchIn), outD = new Date(rec.punchOut);
  const inM = inD.getHours() * 60 + inD.getMinutes();
  const outM = outD.getHours() * 60 + outD.getMinutes();
  const worked = (outD.getTime() - inD.getTime()) / 60000;
  const late = Math.max(0, inM - shiftS);
  const under = Math.max(0, shiftE - outM);
  const regular = Math.max(0, Math.min(worked, sched));
  const ot = Math.max(0, worked - sched);
  const nd = ndMins(inM, outM);
  return {
    regularHours: toHrs(regular), otHours: toHrs(ot), ndHours: toHrs(nd),
    lateMinutes: late, undertimeMinutes: under, totalHours: toHrs(worked),
  };
}
