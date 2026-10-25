import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronUp, Inbox, Loader2, Play, RotateCcw, Users, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchResetStatus, problem, runDailyJob, startReset } from "./demo";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ACTION = "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/40 focus-visible:ring-offset-2 disabled:opacity-60";

/** A small "Demo" pill, bottom-left on every page of the demo, that opens the presenter's tools. It floats, so it never shifts a page's layout. */
export default function DemoToolbox() {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<{ busy?: boolean; text?: string; error?: boolean }>({});
  const [reset, setReset] = useState<"idle" | "confirm" | "running">("idle");
  const [resetError, setResetError] = useState("");
  const { user } = useAuth();
  const box = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function onRunJob() {
    setJob({ busy: true });
    try {
      const r = await runDailyJob();
      setJob({ text: `Done: ${plural(r.emails_sent, "email", "emails")} sent, ${plural(r.delinquent_marked, "loan", "loans")} marked delinquent.` });
    } catch (e) {
      setJob({ text: problem(e, "The daily job could not run."), error: true });
    }
  }

  async function onReset() {
    setResetError("");
    try {
      await startReset();
    } catch (e) {
      setReset("idle");
      setResetError(problem(e, "The reset could not start."));
      return;
    }
    setReset("running");
    // the rebuild runs on the server as its own process; ask how it is going until it says it is done, then show the fresh data
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const s = await fetchResetStatus();
        if (s.reset === "done") return window.location.reload();
        if (s.reset === "failed") break;
      } catch {
        /* the server is busy rebuilding: ask again */
      }
    }
    setReset("idle");
    setResetError("The reset did not finish. Try again in a minute.");
  }

  return (
    <div ref={box} className="fixed bottom-4 left-4 z-[60] text-[13px]">
      {open && (
        <section aria-label="Demo tools" className="mb-2 w-[min(300px,calc(100vw-2rem))] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-900/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-bold text-slate-900">Demo environment</p>
              <p className="mt-0.5 leading-snug text-slate-600">Sample data only. Nothing here is real.</p>
            </div>
            <button type="button" aria-label="Close demo tools" onClick={() => setOpen(false)} className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-200/70">
            {user ? <>Signed in as <strong className="font-semibold text-slate-900">{user.name || user.email}</strong></> : "Not signed in"}
          </p>

          <div className="mt-3 space-y-2">
            <Link to="/demo" className={`${ACTION} bg-[#0F2C59] text-white hover:bg-[#0b2247]`}>
              <Users className="h-4 w-4" /> {user ? "Switch role" : "Choose a role"}
            </Link>
            <button type="button" onClick={onRunJob} disabled={job.busy} className={`${ACTION} bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50`}>
              {job.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run today's job
            </button>
            <p role="status" className={`px-1 leading-snug ${job.error ? "text-red-700" : "text-slate-600"}`}>
              {job.text ?? "Sends the day's reminders and delinquency notices, exactly like the scheduled job."}
            </p>
            <Link to="/demo/inbox" className={`${ACTION} bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50`}>
              <Inbox className="h-4 w-4" /> Open inbox
            </Link>
          </div>

          {isAdmin && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              {reset === "confirm" ? (
                <div>
                  <p className="leading-snug text-slate-700">This puts all the sample data back as it started and throws away what you changed.</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => { setReset("running"); onReset(); }} className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-3 font-semibold text-white hover:bg-red-700">Reset now</button>
                    <button type="button" onClick={() => setReset("idle")} className="min-h-[44px] flex-1 rounded-xl bg-white px-3 font-semibold text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={reset === "running"} onClick={() => { setResetError(""); setReset("confirm"); }} className={`${ACTION} bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50`}>
                  {reset === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  {reset === "running" ? "Rebuilding the data…" : "Reset demo data"}
                </button>
              )}
              {resetError && <p role="alert" className="mt-2 leading-snug text-red-700">{resetError}</p>}
            </div>
          )}
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#081430] px-4 font-semibold text-white shadow-lg ring-1 ring-white/20 transition-colors hover:bg-[#0F2C59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-amber-400" />
        Demo
        <ChevronUp aria-hidden className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
    </div>
  );
}
