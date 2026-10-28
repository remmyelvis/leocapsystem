import { useEffect, useRef, useState, type PointerEventHandler, type ReactNode } from "react";
import { windWave } from "./leo";

// The "Ask Leo" capsule that opens when the badge is hovered or focused. It is meant to feel the way the rest of the app does: calm, unhurried,
// never bouncy. So nothing here is an easing curve and nothing is cartoonish: Leo and the capsule are two springs that are almost
// critically damped, which makes them ease out and settle with less than a pixel of overshoot, the way real things move.
//   1. Leo leads: he glides out 10 px the way the capsule will go.
//   2. A beat behind him the capsule follows, flowing out from behind him. Its edge is water (the same wind ripples as his rim, leo.tsx),
//      barely there and gone as it settles.
//   3. The letters of "Ask Leo" fade in as the capsule's edge passes each one, with a small drift from the lower right (the way the wind blows from).
//   4. The moment the capsule arrives he lowers his head a little, a gentle 5 degree settle (CSS, on [data-settled]). That is the end of it.
// Closing runs it back: the capsule draws in, then he returns. The hover area is the box that does not move, so leading never leaves the
// pointer outside him. Reduced motion: it just appears. The loop exists only while something is moving and stops once everything is at rest.

const H = 44; // capsule height
const FULL = 125; // its length when open; the right end stays under the badge
const REACH = -10; // how far Leo leads out
const WIDE = 170; // room the drawing has to the left of the badge
const TALL = H + 32; // room for the shadow
const WORD = "Ask Leo".split("");
const TEXT_RIGHT = 59; // the word ends this far left of the badge's middle

/** The outline of a rounded rectangle from x = -length to 0, each point pushed along its outward normal by the water. */
function capsule(length: number, amp: number, t: number) {
  if (length < 1) return "";
  const r = Math.min(H / 2, length / 2);
  const pts: [number, number, number, number][] = []; // x, y, normal x, normal y
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number, n: number) => {
    for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, nx, ny]);
  };
  const arc = (cx: number, cy: number, from: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = from + ((Math.PI / 2) * i) / n;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  };
  const top = -H / 2, bottom = H / 2, left = -length, right = 0;
  edge(left + r, top, right - r, top, 0, -1, 44);
  arc(right - r, top + r, -Math.PI / 2, 8);
  edge(right, top + r, right, bottom - r, 1, 0, 2);
  arc(right - r, bottom - r, 0, 8);
  edge(right - r, bottom, left + r, bottom, 0, 1, 44);
  arc(left + r, bottom - r, Math.PI / 2, 8);
  edge(left, bottom - r, left, top + r, -1, 0, 2);
  arc(left + r, top + r, Math.PI, 8);
  let d = "";
  pts.forEach(([x, y, nx, ny], i) => {
    const lift = amp ? amp * windWave(x, y, t, 4) : 0;
    d += `${i ? "L" : "M"}${(x + nx * lift).toFixed(1)} ${(y + ny * lift).toFixed(1)}`;
  });
  return `${d}Z`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function AskLeoHover({ open, onPointerEnter, onPointerLeave, onOpen, children }: { open: boolean; onPointerEnter: PointerEventHandler; onPointerLeave: PointerEventHandler; onOpen: () => void; children: (lunging: boolean) => ReactNode }) {
  const lead = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const need = useRef<number[]>([]); // how long the capsule must be for its edge to have passed each letter
  const openNow = useRef(open);
  const sim = useRef({ x: 0, vx: 0, L: 0, vL: 0, t0: 0, raf: 0, arrived: false, holdX: 0, seed: Math.random() * 40 });
  const [settled, setSettled] = useState(false);
  const [lunging, setLunging] = useState(false);

  useEffect(() => {
    const word = letters.current[0]?.parentElement;
    // a letter starts arriving once the capsule's edge has reached its middle (never before, or it would float on bare background) and has arrived 14 px later: the leftmost finishes before the capsule is full
    if (word) need.current = letters.current.map((el) => (el ? TEXT_RIGHT - 2 + (word.offsetWidth - (el.offsetLeft + el.offsetWidth / 2)) : 0));
  }, []);

  useEffect(() => {
    openNow.current = open;
    const s = sim.current;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    s.t0 = 0; // set from the first frame's own timestamp, so every time in the loop comes from one clock
    s.arrived = false;
    s.holdX = s.x;
    setSettled(false);
    setLunging(open && !calm.matches);

    const paint = (amp: number, t: number) => {
      if (lead.current) lead.current.style.transform = `translateX(${s.x.toFixed(2)}px)`;
      path.current?.setAttribute("d", capsule(s.L, amp, t));
      letters.current.forEach((el, i) => {
        if (!el) return;
        const p = clamp((s.L - (need.current[i] ?? 0)) / 14, 0, 1);
        el.style.opacity = String(p);
        // a small drift in from the lower right: the wind blows up and to the left
        el.style.transform = p === 1 ? "" : `translate(${((1 - p) * 3).toFixed(1)}px, ${((1 - p) * 4).toFixed(1)}px)`;
      });
    };

    if (calm.matches) {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      Object.assign(s, { x: 0, vx: 0, L: open ? FULL : 0, vL: 0 });
      paint(0, 0);
      return;
    }
    if (s.raf) return; // a loop is running already: it reads openNow, so it simply turns around
    let last = 0;
    const frame = (now: number) => {
      if (!s.t0) s.t0 = now;
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 0.016;
      last = now;
      const el = (now - s.t0) / 1000;
      const opening = openNow.current;
      const targetX = opening ? REACH : el < 0.08 ? s.holdX : 0;
      const targetL = opening && el >= 0.08 ? FULL : 0;
      // Both springs are close to critically damped (damping ratio about 0.85 to 0.9): they ease out and settle, with no bounce.
      s.vx += (300 * (targetX - s.x) - 29 * s.vx) * dt;
      s.x += s.vx * dt;
      const k = opening ? 190 : 300;
      s.vL += (k * (targetL - s.L) - (opening ? 25 : 2 * Math.sqrt(k)) * s.vL) * dt;
      s.L = Math.max(0, s.L + s.vL * dt);
      const amp = opening ? 0.55 * Math.exp(-el / 0.35) : 0.3 * Math.exp(-el / 0.2);
      paint(amp, el * 1.5 + s.seed);
      if (opening && !s.arrived && el > 0.12 && s.L >= FULL * 0.94) {
        s.arrived = true;
        setSettled(true); // the tilt: his head goes over the instant the capsule arrives
        setLunging(false);
      }
      const still = Math.abs(s.vx) < 4 && Math.abs(s.vL) < 6;
      if (opening ? s.arrived && still && Math.abs(s.x - REACH) < 0.25 && Math.abs(s.L - FULL) < 0.4 : still && s.L < 0.3 && Math.abs(s.x) < 0.25 && el > 0.15) {
        Object.assign(s, { x: opening ? REACH : 0, vx: 0, L: opening ? FULL : 0, vL: 0, raf: 0 });
        paint(0, 0);
        return;
      }
      s.raf = requestAnimationFrame(frame);
    };
    s.raf = requestAnimationFrame(frame);
  }, [open]);
  useEffect(
    () => () => {
      cancelAnimationFrame(sim.current.raf);
      sim.current.raf = 0; // otherwise the "a loop is running" guard above would block every later opening (React runs effects twice in development)
    },
    []
  );

  return (
    <div className="leo-hover relative" data-settled={settled} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <div id="leo-tip" role="tooltip" aria-hidden={!open}>
        <span className="sr-only">Ask Leo</span>
        <svg
          className="pointer-events-none absolute"
          style={{ right: 30, top: 30 - TALL / 2, filter: "drop-shadow(0 8px 10px rgba(8,20,48,0.28))" }}
          width={WIDE}
          height={TALL}
          viewBox={`${-WIDE} ${-TALL / 2} ${WIDE} ${TALL}`}
          aria-hidden="true"
          focusable="false"
        >
          <path ref={path} d="" fill="#fff" stroke="#e2e8f0" strokeWidth="1" strokeLinejoin="round" style={{ pointerEvents: "visiblePainted", cursor: "pointer" }} onClick={onOpen} />
        </svg>
        <span className="pointer-events-none absolute flex items-center whitespace-pre text-[15px] font-semibold text-[#0F2C59]" style={{ right: TEXT_RIGHT + 30, top: 8, height: H }} aria-hidden="true">
          {WORD.map((ch, i) => (
            <span key={i} ref={(el) => (letters.current[i] = el)} className="inline-block" style={{ opacity: 0 }}>
              {ch}
            </span>
          ))}
        </span>
      </div>
      <div ref={lead}>{children(lunging)}</div>
    </div>
  );
}
