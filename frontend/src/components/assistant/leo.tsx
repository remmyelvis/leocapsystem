import { useEffect, useRef } from "react";
import hello from "./leo/hello.webp";
import thinking from "./leo/thinking.webp";
import happy from "./leo/happy.webp";
import celebrating from "./leo/celebrating.webp";
import wink from "./leo/wink.webp";

// Leo, the Leocap assistant: a lion cub whose mane is built from the logo's reds. The artwork was designed in Google Stitch;
// each mood is one square of its sprite sheet, with the head sized and centred the same in every file on the brand navy
// (#0F2C59), so a round badge needs no cut-out and no halo. WebP, about 11 KB each.
// Only put him on navy (as here), white or sand: his red mane disappears on a red background.

export type LeoMood = "hello" | "thinking" | "happy" | "celebrating" | "wink";

const IMAGE: Record<LeoMood, string> = { hello, thinking, happy, celebrating, wink };

// The head fills 80% of its square. Inside a circle it can be shown a little larger, except where confetti sits further out.
const ZOOM: Partial<Record<LeoMood, number>> = { celebrating: 0.96 };

/** Fetch the other moods ahead of time, so changing his face never flashes. */
export function preloadLeo() {
  Object.values(IMAGE).forEach((src) => {
    new Image().src = src;
  });
}

export function LeoAvatar({ mood = "hello", size = 40, className = "" }: { mood?: LeoMood; size?: number; className?: string }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-full bg-[#0F2C59] ${className}`} style={{ width: size, height: size }}>
      <img
        src={IMAGE[mood]}
        alt=""
        width={size}
        height={size}
        draggable={false}
        decoding="async"
        className="block h-full w-full select-none object-cover"
        style={{ transform: `scale(${ZOOM[mood] ?? 1.1})` }}
      />
    </span>
  );
}

// The water around the badge (styles: .leo-orb* in pages/globals.css). The white rim is the surface of water: a still, perfect circle when
// nothing is going on, and fine wind ripples when something is. Wind does not bend a bowl, it roughens the water: so the rim stays round and
// carries small ripples that all travel the same way across it, in gusts with lulls between. The wind blows up and to the left, towards the
// hello bubble, and the ripples that spread from the badge drift that way too. It only stirs when it means something:
//   rest      a still, perfect circle (nothing runs at all)
//   welcome   the first seconds of a visit: a light breeze, and the badge rocking gently
//   call      the hello bubble is showing: a gust, ripples drifting out, and Leo tips his head to wave
//   touch     the badge is hovered or focused: the wind picks up
//   glide     he is leading the "Ask Leo" capsule out: his rim kicks up for a moment (see askLeo.tsx)
//   thinking  a stir while he "types"
// `burst` is a number that changes each time something should be celebrated (a splash of rings). `ring` draws the rim (solid = the
// white rim on the launcher, soft = the faint one in the chat header).
export type OrbState = "rest" | "welcome" | "call" | "touch" | "glide" | "thinking";

// [how rough the water gets (px of ripple height), how fast the ripples travel]
const WIND: Record<OrbState, [number, number]> = { rest: [0, 1], welcome: [0.9, 1], call: [1.8, 1.5], touch: [1.4, 1.3], glide: [1.5, 1.4], thinking: [1.2, 2.2] };
const PAD = 14; // room around the badge for the ripples
const POINTS = 160; // a ripple is as short as 7 px and the rim 200 px long
const BLOWS = -2.2; // radians: the direction the wind blows towards (up and to the left)
// Three ripple trains: [wave number (rad/px), speed (rad/s), phase, weight, how much the crests lean across the wind]
const TRAINS = [
  [0.42, 5.5, 0, 0.55, 0.35],
  [0.6, 9.5, 2.1, 0.3, -0.5],
  [0.9, 15, 4, 0.15, 0.9],
] as const;

/** The height of the water at a point (x, y px from the middle of the badge) at time t: three trains of ripples running with the wind. Shared by the rim and the capsule. */
export function windWave(x: number, y: number, t: number, phase: number) {
  // where the point is along the wind (s) and across it (u): ripples are straight crests moving with the wind, not waves going round anything
  const s = x * Math.cos(BLOWS) + y * Math.sin(BLOWS);
  const u = y * Math.cos(BLOWS) - x * Math.sin(BLOWS);
  let w = 0;
  for (const [k, speed, ph, weight, lean] of TRAINS) w += weight * Math.sin(k * s + lean * k * u - speed * t + ph + phase);
  return w;
}

/** Gusts and lulls: two slow rhythms that never line up, so the pattern does not repeat. */
export const gustAt = (t: number, phase: number) => 0.3 + 0.7 * Math.max(0, Math.sin(0.55 * t + phase) * Math.sin(0.21 * t + 1.7));

/** One closed ring of water with wind across it. */
function ripple(c: number, radius: number, amp: number, t: number, phase: number) {
  const gust = gustAt(t, phase);
  // a patch of rougher water drifting about the upwind side of the ring
  const patchAt = BLOWS + Math.PI + 0.9 * Math.sin(0.23 * t + phase);
  const cx = c + Math.cos(BLOWS) * amp * 0.15 * gust;
  const cy = c + Math.sin(BLOWS) * amp * 0.15 * gust;
  const parts: string[] = [];
  for (let i = 0; i < POINTS; i++) {
    const angle = (i / POINTS) * Math.PI * 2;
    const w = windWave(radius * Math.cos(angle), radius * Math.sin(angle), t, phase);
    const rough = 0.4 + 0.6 * (0.5 + 0.5 * Math.cos(angle - patchAt));
    const r = radius + amp * gust * rough * w + amp * 0.12 * Math.sin(0.9 * t + phase);
    parts.push(`${i ? "L" : "M"}${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `${parts.join("")}Z`;
}

function WaterRim({ size, state, soft }: { size: number; state: OrbState; soft: boolean }) {
  const rim = useRef<SVGPathElement>(null);
  const run = useRef({ amp: 0, t: Math.random() * 50, raf: 0 });
  const aim = useRef(WIND[state]);
  aim.current = WIND[state];
  const c = size / 2 + PAD;
  const rimR = size / 2 + (soft ? 1.1 : 1.5); // the rim sits just outside the face, where the old white ring was
  const paint = (amp: number, t: number) => {
    rim.current?.setAttribute("d", ripple(c, rimR, amp, t, 0));
  };
  const paintRef = useRef(paint);
  paintRef.current = paint;

  // The loop only exists while the water is stirring: it eases in, eases out, and stops once the rim is a still circle again.
  useEffect(() => {
    const s = run.current;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (s.raf || calm.matches || WIND[state][0] === 0) return;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const [amp, speed] = calm.matches ? [0, 1] : aim.current;
      s.amp += (amp - s.amp) * Math.min(1, dt * 1.6);
      s.t += dt * speed;
      if (amp === 0 && s.amp < 0.02) {
        s.amp = 0;
        s.raf = 0;
        paintRef.current(0, 0);
        return;
      }
      paintRef.current(s.amp, s.t);
      s.raf = requestAnimationFrame(frame);
    };
    s.raf = requestAnimationFrame(frame);
  }, [state]);
  useEffect(
    () => () => {
      cancelAnimationFrame(run.current.raf);
      run.current.raf = 0;
    },
    []
  );

  return (
    <svg className="pointer-events-none absolute" style={{ left: -PAD, top: -PAD }} width={size + PAD * 2} height={size + PAD * 2} aria-hidden="true" focusable="false">
      <path ref={rim} d={ripple(c, rimR, 0, 0, 0)} fill="none" stroke="#fff" strokeOpacity={soft ? 0.36 : 1} strokeWidth={soft ? 2.2 : 3} strokeLinejoin="round" />
    </svg>
  );
}

export function LeoOrb({ mood = "hello", size = 40, state = "rest", burst = 0, ring, className = "" }: { mood?: LeoMood; size?: number; state?: OrbState; burst?: number; ring?: "solid" | "soft"; className?: string }) {
  return (
    <span className={`leo-orb leo-orb--${state} relative inline-block shrink-0 rounded-full ${className}`} style={{ width: size, height: size }}>
      <span className="leo-ripple" aria-hidden="true" />
      <span className="leo-ripple leo-ripple-2" aria-hidden="true" />
      <span className="leo-orb-face relative grid rounded-full">
        <LeoAvatar mood={mood} size={size} />
      </span>
      {ring && <WaterRim size={size} state={state} soft={ring === "soft"} />}
      {burst > 0 && <span key={burst} className="leo-burst" aria-hidden="true" />}
    </span>
  );
}
