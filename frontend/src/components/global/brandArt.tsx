// Brand artwork shared by the landing page and the sign-in pages.

// Light speckle on the dark navy: a flat saturated field reads as a template, a faint grain reads as a surface.
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .14 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";


// The shape of the Leocap mark, redrawn large and faint so the panel feels like the brand without a logo on navy.
export function MarkMotif({ className = "", strength = 1 }: { className?: string; strength?: number }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden>
      <polygon points="12,228 104,26 170,26 76,228" fill="#ff6a3d" fillOpacity={0.13 * strength} />
      <polygon points="104,26 170,26 128,98" fill="#e8310a" fillOpacity={0.18 * strength} />
      <polygon points="170,26 237,228 178,228 128,98" fill="#b3180a" fillOpacity={0.2 * strength} />
    </svg>
  );
}


// A dark brand surface: the grain over a gradient, so a flat navy never reads as a template.
// `layers` = how many gradients follow the grain; every layer needs its own size or the list repeats and tiles them.
export const navy = (gradient: string, layers = 1) => ({
  backgroundImage: `${GRAIN}, ${gradient}`,
  backgroundSize: `180px 180px${", 100% 100%".repeat(layers)}`,
});
