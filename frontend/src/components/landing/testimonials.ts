// Testimonials shown on the landing page.
//
// ONLY ADD REAL ONES. Every entry must be a genuine quote from a client who agreed to be named (and, if you
// name a company, a company that agreed to it). An entry is shown on the live site only when `verified` is true.
// Nothing here is shown on the live site until at least one entry exists, and the section stays hidden until then.
//
//   product : "Salary Advance" | "Personal Loan" | "Installment Loan"   (optional, shown in the slip's top strip)
//   status  : a loan status such as "disbursed" (optional, shows the same badge clients see on their dashboard)
//   outcome : a short fact the client mentions, for example "Approved in 4 hours" (optional)
//   photo   : a path or URL to a square photo (optional; initials are shown without one)

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  verified: boolean;
  product?: string;
  status?: string;
  outcome?: string;
  photo?: string;
}

export const TESTIMONIALS: Testimonial[] = [];

/** Verified quotes: the only thing the live site ever shows. */
export const verifiedTestimonials = (): Testimonial[] => TESTIMONIALS.filter((t) => t.verified);

/**
 * Sample quotes for reviewing the design on a developer's machine (?sample=1..4 picks how many).
 * The samples live in their own file and are imported only inside this DEV check, so a production build
 * does not contain them at all.
 */
export async function loadSamples(): Promise<Testimonial[]> {
  if (import.meta.env.DEV) {
    const { SAMPLES } = await import("./testimonialSamples");
    const n = Number(new URLSearchParams(window.location.search).get("sample")) || 3;
    return SAMPLES.slice(0, Math.min(Math.max(n, 1), SAMPLES.length));
  }
  return [];
}
