// Testimonials shown on the landing page.
//
// The real ones are managed by an admin (Admin > Site content > Testimonials). The server only ever sends quotes the
// client agreed to, and the section stays hidden until there is at least one.
//
//   product : "Salary Advance" | "Personal Loan" | "Installment Loan"   (optional, shown in the slip's top strip)
//   status  : a loan status such as "disbursed" (optional, shows the same badge clients see on their dashboard; samples only)
//   outcome : a short fact the client mentions, for example "Approved in 4 hours" (optional)
//   photo   : a path or URL to a square photo (optional; initials are shown without one; samples only)

import type { TestimonialItem } from "@/lib/siteContent/types";

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

/** The published quotes. Each one has the client's agreement (the server leaves out the rest). */
export const fromContent = (items: TestimonialItem[]): Testimonial[] =>
  items.filter((t) => t.consent).map((t) => ({ name: t.name, role: t.role, quote: t.quote, verified: true, product: t.product || undefined, outcome: t.outcome || undefined }));

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
