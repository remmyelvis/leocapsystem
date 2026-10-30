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
  /** Opening hours as one line of text. Missing (a copy saved before this existed) means the built-in wording; empty means none are shown. */
  hours?: string;
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

export interface HeroBlock {
  badge: string;
  headline_1: string;
  /** The second headline line, shown in the red-to-amber colour. */
  headline_2: string;
  /** One line of text; **bold** is the only mark allowed. */
  intro: string;
  primary_label: string;
  secondary_label: string;
  /** Exactly three. */
  stats: { value: string; label: string }[];
}

export interface ProductCard {
  title: string;
  tag: string;
  description: string;
  features: string[];
  /** The "Most Popular" card (at most one). */
  featured: boolean;
  coming_soon: boolean;
}

export interface ProductsBlock {
  eyebrow: string;
  title: string;
  lead: string;
  /** One to three cards. */
  items: ProductCard[];
}

export interface HowBlock {
  eyebrow: string;
  title: string;
  lead: string;
  /** Exactly three. */
  steps: { title: string; description: string }[];
  cta: { title: string; text: string; button: string };
}

export interface HeadingsBlock {
  contact_eyebrow: string;
  contact_title: string;
  contact_lead: string;
  testimonials_eyebrow: string;
  testimonials_title: string;
  testimonials_lead: string;
}

export interface PolicySection {
  title: string;
  /** The section's text in the site's small text format. The section number comes from its position. */
  body: string;
}

/** A loan agreement: a title, an opening paragraph and lettered sections of plain lines (kept as typed). "{{employer}}" (the Salary Advance one only) is filled in when it is shown. */
export interface AgreementBlock {
  title: string;
  intro: string;
  items: PolicySection[];
}

export interface SiteBlocks {
  contact: ContactBlock;
  banner: BannerBlock;
  testimonials: { items: TestimonialItem[] };
  faq: { items: FaqItem[] };
  home_hero: HeroBlock;
  home_products: ProductsBlock;
  home_how: HowBlock;
  home_headings: HeadingsBlock;
  privacy: { items: PolicySection[] };
  /** Never part of the public pages' content: the forms fetch them from /api/site-content/agreement/<kind>. The built-in text lives on the server. */
  agreement_salary: AgreementBlock;
  agreement_personal: AgreementBlock;
}

/** The contact details as the pages use them. */
export interface ContactView {
  email: string;
  phones: { label: string; href: string }[];
  address: string;
  mapsUrl: string;
  /** Embeddable map of the address (home page). */
  mapEmbedUrl: string;
  /** Opening hours, one line ("" = show none). */
  hours: string;
}
