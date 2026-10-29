import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A bar that stays in view along the bottom of a form (what they would receive, and Submit). It is drawn into the slot the dashboard shell keeps
// between the page and the phone's tab bar (DashboardShell, id "shell-footer"), so the page above simply ends where the bar starts: nothing
// to measure, nothing covered. While it shows, Leo's button stands above it (html.has-apply-bar in globals.css), not over Submit.
// A Submit button in here belongs to its form through the `form` attribute, because it is not inside the form's markup.
export default function ApplyBar({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("shell-footer"));
    document.documentElement.classList.add("has-apply-bar");
    return () => document.documentElement.classList.remove("has-apply-bar");
  }, []);
  return slot ? createPortal(<div className="border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(15,44,89,0.18)] sm:px-6">{children}</div>, slot) : null;
}
