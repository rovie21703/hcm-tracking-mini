export type Role = "admin" | "employee";

export interface UserProfile {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  role: Role;
  timezone: string;
  schedule: { start: string; end: string };
}

export interface Punch {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  punchIn: string; // ISO string
  punchOut: string | null; // ISO string or null while active
}

export interface Metrics {
  regularHours: number;
  otHours: number;
  ndHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  totalHours: number;
}

export interface DailySummary {
  id: string; // `${userId}_${date}`
  userId: string;
  date: string;
  regularHours: number;
  otHours: number;
  ndHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  totalHours: number;
  updatedAt: string;
}
