// The editable text of the public pages. These shapes match what the server stores (backend/website/site_content.py).

export const TOPICS = ["Getting started", "Loans & money", "Your account", "Privacy & contact"] as const;
export type Topic = (typeof TOPICS)[number];

export const BANNER_TONES = ["info", "warning", "success"] as const;
export type BannerTone = (typeof BANNER_TONES)[number];

export interface ContactBlock {
  email: string;
  phones: { number: string }[];
  address: string;
  /** Blank means "a Google Maps search for the address". */
  maps_url: string;
}

export interface BannerBlock {
  enabled: boolean;
  text: string;
  link_label: string;
  link_url: string;
  tone: BannerTone;
}

export interface TestimonialItem {
  name: string;
  role: string;
  quote: string;
  consent: boolean;
  product?: string;
  outcome?: string;
}

export interface FaqItem {
  id: string;
  topic: Topic;
  q: string;
  /** The answer in the site's small text format (see lib/siteContent/format.tsx). */
  a: string;
  popular: boolean;
}

export interface SiteBlocks {
  contact: ContactBlock;
  banner: BannerBlock;
  testimonials: { items: TestimonialItem[] };
  faq: { items: FaqItem[] };
}

/** The contact details as the pages use them. */
export interface ContactView {
  email: string;
  phones: { label: string; href: string }[];
  address: string;
  mapsUrl: string;
  /** Embeddable map of the address (home page). */
  mapEmbedUrl: string;
}
