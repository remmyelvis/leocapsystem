import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useSession } from "@/contexts/AuthContext";
import { AskLeoHover } from "./askLeo";
import { LeoOrb } from "./leo";

// Leo's round button (bottom right) and the one-time hello above it. The chat itself is a separate file, fetched when it is first
// needed (or when a finger or pointer gets near the button), and the button appears only once the page has finished its own work,
// so none of this touches how fast a page first shows.

const loadPanel = () => import("./ChatPanel");
const ChatPanel = lazy(loadPanel);

// No Leo in the staff portals or their sign-in, the password-reset page, or the demo's own pages.
const HIDDEN = ["/admin", "/hr", "/finance", "/login/admin", "/reset-password", "/demo"];

// What he says first, by page. Pages not listed get the button without a hello.
const HELLO: Record<string, string> = {
  "/": "Karibu! Not sure which loan fits? Ask Leo.",
  "/register": "Need a hand creating your account? Ask Leo.",
  "/login/applicant": "Forgot your password? Leo can help.",
  "/faq": "Can't find your answer? Ask Leo.",
};

// The hello shows once a week per browser, never again after someone has opened the chat.
const GREETED = "leocap_assistant_greeted";
const WEEK = 7 * 24 * 60 * 60 * 1000;
const greetedRecently = () => {
  try {
    return Date.now() - Number(localStorage.getItem(GREETED) ?? 0) < WEEK;
  } catch {
    return true; // storage blocked: stay quiet rather than repeat ourselves
  }
};
const markGreeted = () => {
  try {
    localStorage.setItem(GREETED, String(Date.now()));
  } catch {
    // nothing to do
  }
};

// The first seconds of a visit the aura draws the eye once; later pages stay quiet (it still wakes up for the hello and on hover).
const SEEN = "leocap_assistant_seen";
const seen = () => {
  try {
    return !!sessionStorage.getItem(SEEN);
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN, "1");
  } catch {
    // nothing to do
  }
};

export default function AssistantWidget() {
  const { pathname } = useLocation();
  const { data } = useSession();
  const role = String((data?.user as { role?: string } | undefined)?.role ?? "").toLowerCase();
  // Applicants sign in with the role "USER"; admin, HR, finance (and any role added later) are staff, who do not see Leo.
  const hidden = HIDDEN.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || (!!role && role !== "user" && role !== "applicant");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [greet, setGreet] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [touch, setTouch] = useState(false);
  const [tip, setTip] = useState(false);
  const tipTimer = useRef<number>();
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // The hello is written for newcomers: someone who is signed in does not get it.
  const hello = data?.user ? undefined : HELLO[pathname];

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  useEffect(() => {
    setGreet(false);
    if (!ready || open || hidden || !hello || greetedRecently()) return;
    const id = window.setTimeout(() => {
      setGreet(true);
      markGreeted();
    }, 6000);
    return () => window.clearTimeout(id);
  }, [ready, open, hidden, hello, pathname]);

  useEffect(() => {
    if (!greet) return;
    const id = window.setTimeout(() => setGreet(false), 15000);
    return () => window.clearTimeout(id);
  }, [greet]);

  const showing = ready && !hidden;
  useEffect(() => {
    if (!showing || seen()) return;
    setWelcome(true);
    const id = window.setTimeout(() => {
      setWelcome(false);
      markSeen();
    }, 18000);
    return () => window.clearTimeout(id);
  }, [showing]);

  // When the chat closes, focus goes back to the button that opened it.
  useEffect(() => {
    if (wasOpen.current && !open) launcher.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => () => window.clearTimeout(tipTimer.current), []);

  useEffect(() => {
    document.documentElement.classList.toggle("leo-on", showing);
    return () => document.documentElement.classList.remove("leo-on");
  }, [showing]);

  if (!showing) return null;

  // Pointing at him (a mouse or pen; a finger has no hover and already gets the hello) wakes the water at once and, after a short dwell so a
  // pointer merely passing the corner does nothing, opens the "Ask Leo" capsule (askLeo.tsx). Leaving closes it after a moment.
  const pointerIn = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setTouch(true);
    window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => setTip(true), 160);
  };
  const pointerOut = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setTouch(false);
    window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => setTip(false), 160);
  };
  const openChat = () => {
    window.clearTimeout(tipTimer.current);
    setTip(false);
    setTouch(false);
    setGreet(false);
    setWelcome(false);
    markGreeted();
    markSeen();
    setOpen(true);
  };
  const prefetch = () => void loadPanel();
  // On the applicant dashboard a bar of tabs sits along the bottom of a phone: stand above it.
  const lift = pathname.startsWith("/dashboard") ? "bottom-[calc(68px+env(safe-area-inset-bottom))] md:bottom-6" : "bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6";

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ChatPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {!open && (
        <div className={`leo-launcher fixed right-4 z-[45] sm:right-6 ${lift}`}>
          {greet && !tip && hello && (
            <div role="status" className="leo-greet absolute bottom-[72px] right-0 w-[236px] rounded-2xl rounded-br-md bg-white py-3 pl-4 pr-10 shadow-[0_8px_24px_rgba(8,20,48,0.2)] ring-1 ring-slate-200">
              <button type="button" onClick={openChat} className="block w-full text-left text-[14px] font-medium leading-snug text-slate-800 focus-visible:outline-none focus-visible:underline">
                {hello}
              </button>
              <button type="button" onClick={() => setGreet(false)} aria-label="Dismiss" className="absolute right-0 top-0 grid h-[44px] w-[44px] place-items-center text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:text-slate-900">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <AskLeoHover open={tip} onPointerEnter={pointerIn} onPointerLeave={pointerOut} onOpen={openChat}>
            {(lunging) => (
              <button
                ref={launcher}
                type="button"
                onClick={openChat}
                onPointerEnter={prefetch}
                onFocus={(e) => {
                  prefetch();
                  if (e.currentTarget.matches(":focus-visible")) {
                    setTouch(true);
                    setTip(true);
                  }
                }}
                onBlur={() => {
                  setTouch(false);
                  setTip(false);
                }}
                onKeyDown={(e) => e.key === "Escape" && setTip(false)}
                onTouchStart={prefetch}
                aria-describedby={tip ? "leo-tip" : undefined}
                aria-label="Chat with Leo, Leocap's assistant"
                aria-haspopup="dialog"
                className="leo-btn relative grid rounded-full shadow-[0_8px_24px_rgba(8,20,48,0.35)] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F2C59]"
              >
                <LeoOrb size={60} ring="solid" state={touch ? (lunging ? "glide" : "touch") : greet ? "call" : welcome ? "welcome" : "rest"} />
                {greet && <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-red-600 ring-2 ring-white" aria-hidden="true" />}
              </button>
            )}
          </AskLeoHover>
        </div>
      )}
    </>
  );
}
