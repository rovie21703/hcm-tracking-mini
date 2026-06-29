// Server-side computation logic — mirrors src/app/firebase/compute.ts.
// Calculates regular hours, overtime (OT), night differential (ND),
// lateness, and undertime for a single attendance punch.

export interface Schedule { start: string; end: string; }
export interface Punch { id?: string; userId: string; date: string; punchIn: string; punchOut: string | null; }
export interface Metrics {
  regularHours: number; otHours: number; ndHours: number;
  lateMinutes: number; undertimeMinutes: number; totalHours: number;
}

export function toMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toHrs(m: number): number {
  return Math.round((m / 60) * 100) / 100;
}

// Minutes of work that fall in the night-differential window (22:00–06:00).
function ndMins(startM: number, endM: number): number {
  let nd = 0;
  if (endM > 1320) nd += Math.min(endM, 1440) - Math.max(startM, 1320);
  if (startM < 360) nd += Math.min(endM, 360) - startM;
  return Math.max(0, nd);
}

export function computeMetrics(rec: Punch, schedule: Schedule): Metrics {
  const empty: Metrics = { regularHours: 0, otHours: 0, ndHours: 0, lateMinutes: 0, undertimeMinutes: 0, totalHours: 0 };
  if (!rec.punchOut) return empty;

  const shiftS = toMins(schedule.start);
  const shiftE = toMins(schedule.end);
  const sched = shiftE - shiftS;

  const inD = new Date(rec.punchIn);
  const outD = new Date(rec.punchOut);
  const inM = inD.getHours() * 60 + inD.getMinutes();
  const outM = outD.getHours() * 60 + outD.getMinutes();
  const worked = (outD.getTime() - inD.getTime()) / 60000;

  const late = Math.max(0, inM - shiftS);
  const under = Math.max(0, shiftE - outM);
  const regular = Math.max(0, Math.min(worked, sched));
  const ot = Math.max(0, worked - sched);
  const nd = ndMins(inM, outM);

  return {
    regularHours: toHrs(regular),
    otHours: toHrs(ot),
    ndHours: toHrs(nd),
    lateMinutes: late,
    undertimeMinutes: under,
    totalHours: toHrs(worked),
  };
}
