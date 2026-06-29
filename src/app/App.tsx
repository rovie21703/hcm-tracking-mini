import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  Clock, LogOut, BarChart2, CalendarDays, Edit2, Check, X as XIcon,
  LogIn, Timer, ChevronRight, Moon, Sun, AlertTriangle, TrendingUp,
  ClipboardList, Loader2,
} from "lucide-react";

import { auth, isFirebaseConfigured } from "./firebase/config";
import {
  registerUser, loginUser, logoutUser, getUserProfile, getAllUsers,
  punchIn as svcPunchIn, punchOut as svcPunchOut, updatePunch, deletePunch,
  getAllPunches, getUserPunches,
} from "./firebase/service";
import {
  computeMetrics, fmtHrs, fmtMins, fmtTime, fmtDate, todayStr,
  getWeekDates, fmtWeekRange,
} from "./firebase/compute";
import type { UserProfile, Punch, Metrics } from "./firebase/types";

// ── Theme hook ──────────────────────────────────────────────────────────────
function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("hcm_theme") || "light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("hcm_theme", theme);
  }, [theme]);
  return [theme, () => setTheme(t => (t === "dark" ? "light" : "dark"))];
}

function ThemeToggle({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button onClick={toggle} title="Toggle theme"
      className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
      {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded border border-border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{label}</span>
      <span className={`font-mono text-2xl font-semibold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground font-mono">{sub}</span>}
    </div>
  );
}

function Badge({ v, green, amber, red }: { v: string; green?: boolean; amber?: boolean; red?: boolean }) {
  const cls = green ? "text-emerald-500 dark:text-emerald-400"
    : amber ? "text-amber-500 dark:text-amber-400"
    : red ? "text-red-500 dark:text-red-400"
    : "text-muted-foreground";
  return <span className={`font-mono text-xs ${cls}`}>{v}</span>;
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full mr-2 ${active ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#10b981]" : "bg-slate-400 dark:bg-slate-600"}`} />;
}

const C = {
  green: "text-emerald-500 dark:text-emerald-400",
  amber: "text-amber-500 dark:text-amber-400",
  violet: "text-violet-500 dark:text-violet-400",
  red: "text-red-500 dark:text-red-400",
  orange: "text-orange-500 dark:text-orange-400",
  muted: "text-muted-foreground",
};

// ── Setup Banner (shown until Firebase config is pasted) ──────────────────────
function SetupBanner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-lg w-full rounded border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Clock size={16} className="text-primary" />
          </div>
          <h1 className="text-foreground text-lg font-semibold">Connect Firebase to begin</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          This Mini HCM system runs on Firebase (Authentication + Firestore). Paste your
          project credentials to activate it.
        </p>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Create a project at <span className="font-mono text-primary">console.firebase.google.com</span></li>
          <li>Enable <span className="text-foreground">Authentication → Email/Password</span></li>
          <li>Create a <span className="text-foreground">Firestore Database</span> (test mode is fine to start)</li>
          <li>Register a Web App and copy its config</li>
          <li>Paste the values into <span className="font-mono text-primary">src/app/firebase/config.ts</span></li>
        </ol>
        <div className="rounded bg-muted/50 border border-border p-3">
          <p className="text-xs text-muted-foreground">
            On first run, register an account. To make a user an <span className="text-foreground">admin</span>,
            set their <span className="font-mono">role</span> field to <span className="font-mono text-primary">"admin"</span> in
            the Firestore <span className="font-mono">users</span> collection.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Login / Register ──────────────────────────────────────────────────────
function LoginScreen() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (tab === "login") {
        await loginUser(email, pw);
      } else {
        if (!name) { setErr("Name is required."); setBusy(false); return; }
        await registerUser(name, email, pw, { start, end });
      }
      // onAuthStateChanged in App handles the rest.
    } catch (e: any) {
      setErr(e?.code?.replace("auth/", "").replace(/-/g, " ") || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Clock size={16} className="text-primary" />
            </div>
            <span className="font-mono text-sm font-semibold text-primary tracking-widest uppercase">HCM</span>
          </div>
          <h1 className="text-foreground text-xl font-semibold">Mini HCM System</h1>
          <p className="text-muted-foreground text-xs mt-1">Time Tracking & Attendance</p>
        </div>

        <div className="flex border-b border-border mb-6">
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }}
              className={`flex-1 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-input-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60" />
            </div>
          )}
          <div>
            <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              className="w-full bg-input-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Password</label>
            <input value={pw} onChange={e => setPw(e.target.value)} type="password" required
              className="w-full bg-input-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" />
          </div>
          {tab === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Shift Start</label>
                <input value={start} onChange={e => setStart(e.target.value)} type="time"
                  className="w-full bg-input-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Shift End</label>
                <input value={end} onChange={e => setEnd(e.target.value)} type="time"
                  className="w-full bg-input-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 font-mono" />
              </div>
            </div>
          )}
          {err && <p className="text-red-500 dark:text-red-400 text-xs capitalize">{err}</p>}
          <button type="submit" disabled={busy}
            className="w-full bg-primary text-primary-foreground rounded py-2 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : tab === "login" ? <LogIn size={14} /> : null}
            {tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
type View = "dashboard" | "history" | "admin-daily" | "admin-weekly" | "admin-punches";

function Sidebar({ user, view, setView, onLogout, theme, toggleTheme }: {
  user: UserProfile; view: View; setView: (v: View) => void; onLogout: () => void;
  theme: string; toggleTheme: () => void;
}) {
  const employeeNav = [
    { v: "dashboard" as View, icon: <Timer size={14} />, label: "Dashboard" },
    { v: "history" as View, icon: <CalendarDays size={14} />, label: "My History" },
  ];
  const adminNav = [
    { v: "admin-daily" as View, icon: <BarChart2 size={14} />, label: "Daily Report" },
    { v: "admin-weekly" as View, icon: <TrendingUp size={14} />, label: "Weekly Report" },
    { v: "admin-punches" as View, icon: <ClipboardList size={14} />, label: "Manage Punches" },
  ];
  const nav = user.role === "admin" ? adminNav : employeeNav;

  return (
    <aside className="w-52 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
          <Clock size={12} className="text-primary" />
        </div>
        <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">HCM</span>
        <div className="ml-auto"><ThemeToggle theme={theme} toggle={toggleTheme} /></div>
      </div>

      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {user.role === "admin" && <p className="text-[10px] text-sidebar-foreground uppercase tracking-widest px-2 mb-2">Reports</p>}
        {nav.map(item => (
          <button key={item.v} onClick={() => setView(item.v)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
              view === item.v ? "bg-accent text-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}>
            {item.icon} {item.label}
            {view === item.v && <ChevronRight size={10} className="ml-auto" />}
          </button>
        ))}
      </nav>

      {user.role === "employee" && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground uppercase tracking-widest mb-1">My Schedule</p>
          <p className="font-mono text-xs text-sidebar-accent-foreground">{user.schedule.start} — {user.schedule.end}</p>
        </div>
      )}

      <button onClick={onLogout}
        className="mx-2 mb-3 flex items-center gap-2 px-3 py-2 rounded text-xs text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
        <LogOut size={13} /> Sign Out
      </button>
    </aside>
  );
}

// ── Top Bar ────────────────────────────────────────────────────────────────
function TopBar({ title, sub }: { title: string; sub?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="h-12 border-b border-border flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
        <span className="font-mono text-sm text-primary font-semibold tabular-nums">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      </div>
    </div>
  );
}

// ── Week Table ───────────────────────────────────────────────────────────────
function WeekTable({ userId, schedule, records, title, weekDates }: {
  userId: string; schedule: { start: string; end: string }; records: Punch[]; title?: string;
  weekDates?: string[];
}) {
  const dates = weekDates ?? getWeekDates();
  const rows = dates.map(date => {
    const rec = records.find(r => r.userId === userId && r.date === date);
    return { date, rec, m: rec ? computeMetrics(rec, schedule) : null };
  });
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{title || "This Week"}</p>
      <div className="rounded border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {["Date","Punch In","Punch Out","Regular","OT","ND","Late","Undertime"].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, rec, m }) => (
              <tr key={date} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 font-mono text-foreground">{fmtDate(date)}</td>
                <td className="px-3 py-2 font-mono">{rec ? <span className="text-foreground">{fmtTime(rec.punchIn)}</span> : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2 font-mono">{rec?.punchOut ? <span className="text-foreground">{fmtTime(rec.punchOut)}</span> : rec ? <span className={`${C.amber} text-[10px] font-medium`}>ACTIVE</span> : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2"><Badge v={m ? fmtHrs(m.regularHours) : "—"} green={!!m?.regularHours} /></td>
                <td className="px-3 py-2"><Badge v={m?.otHours ? fmtHrs(m.otHours) : "—"} amber={!!m?.otHours} /></td>
                <td className="px-3 py-2"><span className={`font-mono text-xs ${m?.ndHours ? C.violet : C.muted}`}>{m?.ndHours ? fmtHrs(m.ndHours) : "—"}</span></td>
                <td className="px-3 py-2"><Badge v={m?.lateMinutes ? fmtMins(m.lateMinutes) : "—"} red={!!m?.lateMinutes} /></td>
                <td className="px-3 py-2"><Badge v={m?.undertimeMinutes ? fmtMins(m.undertimeMinutes) : "—"} amber={!!m?.undertimeMinutes} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Employee Dashboard ───────────────────────────────────────────────────────
function EmployeeDashboard({ user, records, reload }: { user: UserProfile; records: Punch[]; reload: () => void }) {
  const today = todayStr();
  const todayRec = records.find(r => r.userId === user.id && r.date === today);
  const isPunchedIn = !!todayRec && !todayRec.punchOut;
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPunchedIn || !todayRec) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(todayRec.punchIn).getTime()) / 1000));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [isPunchedIn, todayRec]);

  async function handlePunch() {
    setBusy(true);
    try {
      if (!isPunchedIn) await svcPunchIn(user.id, today);
      else if (todayRec) await svcPunchOut(todayRec, user.schedule);
      await reload();
    } finally { setBusy(false); }
  }

  const m = todayRec ? computeMetrics(todayRec, user.schedule) : null;
  const elapsedFmt = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const weekDates = getWeekDates();

  return (
    <div className="flex flex-col h-full">
      <TopBar title="My Dashboard" sub={`Week of ${fmtWeekRange(weekDates)}`} />
      <div className="p-6 space-y-6 overflow-auto flex-1">
        <div className="rounded border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusDot active={isPunchedIn} />
                <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                  {isPunchedIn ? "Currently Working" : todayRec?.punchOut ? "Shift Complete" : "Not Punched In"}
                </span>
              </div>
              {isPunchedIn && <p className={`font-mono text-3xl font-semibold ${C.green} tabular-nums mt-2`}>{elapsedFmt}</p>}
              {todayRec && (
                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-muted-foreground">In: <span className="font-mono text-foreground">{fmtTime(todayRec.punchIn)}</span></span>
                  {todayRec.punchOut && <span className="text-xs text-muted-foreground">Out: <span className="font-mono text-foreground">{fmtTime(todayRec.punchOut)}</span></span>}
                </div>
              )}
            </div>
            <button onClick={handlePunch} disabled={!!todayRec?.punchOut || busy}
              className={`px-6 py-3 rounded font-semibold text-sm transition-all flex items-center gap-2 ${
                todayRec?.punchOut ? "bg-muted text-muted-foreground cursor-not-allowed"
                : isPunchedIn ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 hover:bg-red-500/30"
                : "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
              }`}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              {todayRec?.punchOut ? "Shift Done" : isPunchedIn ? "Punch Out" : "Punch In"}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Today — {fmtDate(today)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Regular Hrs" value={m ? fmtHrs(m.regularHours) : "—"} color={C.green} />
            <KpiCard label="Overtime" value={m ? fmtHrs(m.otHours) : "—"} color={m?.otHours ? C.amber : C.muted} />
            <KpiCard label="Night Diff" value={m ? fmtHrs(m.ndHours) : "—"} color={m?.ndHours ? C.violet : C.muted} />
            <KpiCard label="Late" value={m ? fmtMins(m.lateMinutes) : "—"} color={m?.lateMinutes ? C.red : C.muted} />
            <KpiCard label="Undertime" value={m ? fmtMins(m.undertimeMinutes) : "—"} color={m?.undertimeMinutes ? C.orange : C.muted} />
          </div>
        </div>

        <WeekTable userId={user.id} schedule={user.schedule} records={records} weekDates={weekDates} />
      </div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────
function HistoryView({ user, records }: { user: UserProfile; records: Punch[] }) {
  const weekDates = getWeekDates();
  const userRecs = records.filter(r => r.userId === user.id && weekDates.includes(r.date));
  const totals = userRecs.reduce((acc, rec) => {
    const m = computeMetrics(rec, user.schedule);
    return { regular: acc.regular + m.regularHours, ot: acc.ot + m.otHours, nd: acc.nd + m.ndHours, late: acc.late + m.lateMinutes, under: acc.under + m.undertimeMinutes };
  }, { regular: 0, ot: 0, nd: 0, late: 0, under: 0 });

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Attendance History" sub={fmtWeekRange(weekDates)} />
      <div className="p-6 space-y-5 overflow-auto flex-1">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Week Totals</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard label="Total Regular" value={fmtHrs(totals.regular)} color={C.green} />
            <KpiCard label="Total OT" value={fmtHrs(totals.ot)} color={totals.ot > 0 ? C.amber : C.muted} />
            <KpiCard label="Total ND" value={fmtHrs(totals.nd)} color={totals.nd > 0 ? C.violet : C.muted} />
            <KpiCard label="Total Late" value={fmtMins(totals.late)} color={totals.late > 0 ? C.red : C.muted} />
            <KpiCard label="Total Undertime" value={fmtMins(totals.under)} color={totals.under > 0 ? C.orange : C.muted} />
          </div>
        </div>
        <WeekTable userId={user.id} schedule={user.schedule} records={userRecs} title="Daily Breakdown" weekDates={weekDates} />
      </div>
    </div>
  );
}

// ── Admin Daily Report ────────────────────────────────────────────────────
function AdminDailyReport({ users, punches }: { users: UserProfile[]; punches: Punch[] }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const empUsers = users.filter(u => u.role === "employee");
  const rows = empUsers.map(u => {
    const rec = punches.find(r => r.userId === u.id && r.date === selectedDate);
    return { user: u, rec, m: rec ? computeMetrics(rec, u.schedule) : null };
  });
  const getters = [
    (m: Metrics | null) => m?.regularHours ?? 0, (m: Metrics | null) => m?.otHours ?? 0,
    (m: Metrics | null) => m?.ndHours ?? 0, (m: Metrics | null) => m?.lateMinutes ?? 0,
    (m: Metrics | null) => m?.undertimeMinutes ?? 0,
  ];
  const colors = [C.green, C.amber, C.violet, C.red, C.orange];

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Daily Report" sub="All employee metrics by day" />
      <div className="p-6 space-y-5 overflow-auto flex-1">
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Date</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="bg-input-background border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {["Regular","OT","ND","Late","Undertime"].map((label, i) => {
            const total = rows.reduce((s, r) => s + getters[i](r.m), 0);
            const fmt = i < 3 ? fmtHrs(total) : fmtMins(total);
            return <KpiCard key={label} label={label} value={fmt} color={total > 0 ? colors[i] : C.muted} sub={`${rows.filter(r => getters[i](r.m) > 0).length} employees`} />;
          })}
        </div>

        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Employee","Schedule","In","Out","Regular","OT","ND","Late","Undertime","Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No employees registered yet.</td></tr>}
              {rows.map(({ user, rec, m }) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium text-foreground">{user.name}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{user.schedule.start}–{user.schedule.end}</td>
                  <td className="px-3 py-2 font-mono">{rec ? fmtTime(rec.punchIn) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono">{rec?.punchOut ? fmtTime(rec.punchOut) : rec ? <span className={C.amber}>ACTIVE</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2"><Badge v={m ? fmtHrs(m.regularHours) : "—"} green={!!m?.regularHours} /></td>
                  <td className="px-3 py-2"><Badge v={m?.otHours ? fmtHrs(m.otHours) : "—"} amber={!!m?.otHours} /></td>
                  <td className="px-3 py-2"><span className={`font-mono text-xs ${m?.ndHours ? C.violet : C.muted}`}>{m?.ndHours ? fmtHrs(m.ndHours) : "—"}</span></td>
                  <td className="px-3 py-2"><Badge v={m?.lateMinutes ? fmtMins(m.lateMinutes) : "—"} red={!!m?.lateMinutes} /></td>
                  <td className="px-3 py-2"><Badge v={m?.undertimeMinutes ? fmtMins(m.undertimeMinutes) : "—"} amber={!!m?.undertimeMinutes} /></td>
                  <td className="px-3 py-2">
                    {!rec ? <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ABSENT</span>
                     : rec.punchOut ? <span className={`text-[10px] ${C.green} bg-emerald-500/10 px-1.5 py-0.5 rounded`}>DONE</span>
                     : <span className={`text-[10px] ${C.amber} bg-amber-500/10 px-1.5 py-0.5 rounded`}>ACTIVE</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Admin Weekly Report ────────────────────────────────────────────────────
function AdminWeeklyReport({ users, punches }: { users: UserProfile[]; punches: Punch[] }) {
  const weekDates = getWeekDates();
  const empUsers = users.filter(u => u.role === "employee");
  const rows = empUsers.map(u => {
    const recs = punches.filter(r => r.userId === u.id && weekDates.includes(r.date));
    const totals = recs.reduce((acc, rec) => {
      const m = computeMetrics(rec, u.schedule);
      return { regular: acc.regular + m.regularHours, ot: acc.ot + m.otHours, nd: acc.nd + m.ndHours, late: acc.late + m.lateMinutes, under: acc.under + m.undertimeMinutes, days: acc.days + (rec.punchOut ? 1 : 0) };
    }, { regular: 0, ot: 0, nd: 0, late: 0, under: 0, days: 0 });
    return { user: u, totals };
  });

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Weekly Report" sub={fmtWeekRange(weekDates)} />
      <div className="p-6 space-y-5 overflow-auto flex-1">
        {empUsers.length === 0 && <p className="text-sm text-muted-foreground">No employees registered yet.</p>}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {rows.map(({ user, totals }) => (
            <div key={user.id} className="rounded border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{user.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{user.schedule.start}–{user.schedule.end}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{totals.days} days</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center"><p className={`font-mono text-sm font-semibold ${C.green}`}>{fmtHrs(totals.regular)}</p><p className="text-[10px] text-muted-foreground">Regular</p></div>
                <div className="text-center"><p className={`font-mono text-sm font-semibold ${totals.ot > 0 ? C.amber : C.muted}`}>{fmtHrs(totals.ot)}</p><p className="text-[10px] text-muted-foreground">OT</p></div>
                <div className="text-center"><p className={`font-mono text-sm font-semibold ${totals.nd > 0 ? C.violet : C.muted}`}>{fmtHrs(totals.nd)}</p><p className="text-[10px] text-muted-foreground">ND</p></div>
              </div>
              <div className="flex gap-3 pt-1 border-t border-border">
                <div className="flex items-center gap-1"><AlertTriangle size={10} className={totals.late > 0 ? C.red : C.muted} /><span className={`text-[11px] font-mono ${totals.late > 0 ? C.red : C.muted}`}>{fmtMins(totals.late)} late</span></div>
                <div className="flex items-center gap-1"><Moon size={10} className={totals.under > 0 ? C.orange : C.muted} /><span className={`text-[11px] font-mono ${totals.under > 0 ? C.orange : C.muted}`}>{fmtMins(totals.under)} under</span></div>
              </div>
            </div>
          ))}
        </div>
        {rows.map(({ user }) => (
          <div key={user.id}>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{user.name}</p>
            <WeekTable userId={user.id} schedule={user.schedule} records={punches} weekDates={weekDates} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Admin Manage Punches ────────────────────────────────────────────────────
function AdminPunches({ users, punches, reload }: { users: UserProfile[]; punches: Punch[]; reload: () => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const allRecs = [...punches].sort((a, b) => b.date.localeCompare(a.date) || b.punchIn.localeCompare(a.punchIn));

  function startEdit(rec: Punch) {
    setEditId(rec.id);
    setEditIn(rec.punchIn.slice(0, 16));
    setEditOut(rec.punchOut ? rec.punchOut.slice(0, 16) : "");
  }
  async function saveEdit(rec: Punch, schedule: { start: string; end: string }) {
    await updatePunch(rec.id, editIn + ":00", editOut ? editOut + ":00" : null, rec, schedule);
    setEditId(null); await reload();
  }
  async function removeRec(rec: Punch) {
    await deletePunch(rec); await reload();
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Manage Punches" sub="View and edit all attendance records" />
      <div className="p-6 overflow-auto flex-1">
        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Employee","Date","Punch In","Punch Out","Regular","OT","ND","Late","Undertime","Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRecs.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No attendance records yet.</td></tr>}
              {allRecs.map(rec => {
                const u = users.find(u => u.id === rec.userId);
                const schedule = u?.schedule ?? { start: "09:00", end: "18:00" };
                const m = computeMetrics(rec, schedule);
                const isEditing = editId === rec.id;
                return (
                  <tr key={rec.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium text-foreground">{u?.name ?? rec.userId}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{fmtDate(rec.date)}</td>
                    <td className="px-3 py-2">
                      {isEditing ? <input type="datetime-local" value={editIn} onChange={e => setEditIn(e.target.value)} className="bg-input-background border border-primary/60 rounded px-1.5 py-0.5 text-xs font-mono text-foreground focus:outline-none w-36" />
                        : <span className="font-mono text-foreground">{fmtTime(rec.punchIn)}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? <input type="datetime-local" value={editOut} onChange={e => setEditOut(e.target.value)} className="bg-input-background border border-primary/60 rounded px-1.5 py-0.5 text-xs font-mono text-foreground focus:outline-none w-36" />
                        : rec.punchOut ? <span className="font-mono text-foreground">{fmtTime(rec.punchOut)}</span> : <span className={`${C.amber} text-[10px]`}>ACTIVE</span>}
                    </td>
                    <td className="px-3 py-2"><Badge v={fmtHrs(m.regularHours)} green={m.regularHours > 0} /></td>
                    <td className="px-3 py-2"><Badge v={m.otHours ? fmtHrs(m.otHours) : "—"} amber={m.otHours > 0} /></td>
                    <td className="px-3 py-2"><span className={`font-mono text-xs ${m.ndHours ? C.violet : C.muted}`}>{m.ndHours ? fmtHrs(m.ndHours) : "—"}</span></td>
                    <td className="px-3 py-2"><Badge v={m.lateMinutes ? fmtMins(m.lateMinutes) : "—"} red={m.lateMinutes > 0} /></td>
                    <td className="px-3 py-2"><Badge v={m.undertimeMinutes ? fmtMins(m.undertimeMinutes) : "—"} amber={m.undertimeMinutes > 0} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(rec, schedule)} className={`${C.green} hover:opacity-70 transition-opacity`}><Check size={12} /></button>
                            <button onClick={() => setEditId(null)} className="text-muted-foreground hover:text-foreground transition-colors"><XIcon size={12} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(rec)} className="text-muted-foreground hover:text-primary transition-colors"><Edit2 size={12} /></button>
                            <button onClick={() => removeRec(rec)} className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors"><XIcon size={12} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>("dashboard");

  // Data
  const [punches, setPunches] = useState<Punch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const reload = useCallback(async () => {
    if (!profile) return;
    if (profile.role === "admin") {
      const [allPunches, allUsers] = await Promise.all([getAllPunches(), getAllUsers()]);
      setPunches(allPunches); setUsers(allUsers);
    } else {
      setPunches(await getUserPunches(profile.id));
    }
  }, [profile]);

  // Track Firebase auth state.
  useEffect(() => {
    if (!isFirebaseConfigured) { setAuthChecked(true); return; }
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        const p = await getUserProfile(fbUser.uid);
        setProfile(p);
        setView(p?.role === "admin" ? "admin-daily" : "dashboard");
      } else {
        setProfile(null);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function handleLogout() { await logoutUser(); setProfile(null); }

  if (!isFirebaseConfigured) return <SetupBanner />;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!profile) return <LoginScreen />;

  const content = (() => {
    if (profile.role === "employee") {
      if (view === "dashboard") return <EmployeeDashboard user={profile} records={punches} reload={reload} />;
      if (view === "history") return <HistoryView user={profile} records={punches} />;
    } else {
      if (view === "admin-daily") return <AdminDailyReport users={users} punches={punches} />;
      if (view === "admin-weekly") return <AdminWeeklyReport users={users} punches={punches} />;
      if (view === "admin-punches") return <AdminPunches users={users} punches={punches} reload={reload} />;
    }
    return null;
  })();

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar user={profile} view={view} setView={setView} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-1 flex flex-col overflow-hidden">{content}</main>
    </div>
  );
}
