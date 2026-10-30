import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import { DEFAULTS } from "./defaults";
import { BANNER_TONES, TOPICS, type ContactView, type SiteBlocks } from "./types";

// The public pages read their editable text from here. It starts from the text built into the app, so a page is never
// empty or waiting: published changes replace it as soon as they arrive, and the last copy is remembered in this browser
// so a returning visitor sees the current text straight away.

const CACHE = "leocap.siteContent.v1";
const PREVIEW = "leocap.sitePreview";
const QUERY = "site-content";

type Published = Partial<Record<keyof SiteBlocks, unknown>>;

/** True while an admin is looking at their unpublished drafts: they open the site with ?preview=1 and it stays on for this tab. */
export function previewMode(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("preview") === "1") sessionStorage.setItem(PREVIEW, "1");
    return sessionStorage.getItem(PREVIEW) === "1";
  } catch {
    return false;
  }
}

export function exitPreview() {
  try {
    sessionStorage.removeItem(PREVIEW);
  } catch {
    /* nothing to clear */
  }
  window.location.assign(window.location.pathname);
}

// Content that does not have the expected shape is ignored, so a bad copy can never break a public page.
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const listOf = (v: unknown, ok: (x: Record<string, unknown>) => boolean) => Array.isArray(v) && v.every((x) => isObj(x) && ok(x));

const allStrings = (v: Record<string, unknown>, keys: string[]) => keys.every((k) => isStr(v[k]));
const count = (v: unknown, lo: number, hi: number) => Array.isArray(v) && v.length >= lo && v.length <= hi;

/** The Privacy Policy and the Terms and Conditions share one shape: numbered sections, each a title and text. */
const policy = (v: unknown) => isObj(v) && count(v.items, 1, 30) && listOf(v.items, (s) => isStr(s.title) && isStr(s.body));

const SHAPE: { [K in keyof SiteBlocks]: (v: unknown) => boolean } = {
  contact: (v) =>
    isObj(v) && isStr(v.email) && isStr(v.address) && isStr(v.maps_url) && (v.hours === undefined || isStr(v.hours)) && listOf(v.phones, (p) => isStr(p.number)) && (v.phones as unknown[]).length > 0,
  banner: (v) =>
    isObj(v) && typeof v.enabled === "boolean" && isStr(v.text) && isStr(v.link_label) && isStr(v.link_url) && (BANNER_TONES as readonly unknown[]).includes(v.tone),
  testimonials: (v) => isObj(v) && listOf(v.items, (t) => isStr(t.name) && isStr(t.role) && isStr(t.quote)),
  home_hero: (v) =>
    isObj(v) && allStrings(v, ["badge", "headline_1", "headline_2", "intro", "primary_label", "secondary_label"]) && count(v.stats, 3, 3) && listOf(v.stats, (x) => isStr(x.value) && isStr(x.label)),
  home_products: (v) =>
    isObj(v) &&
    allStrings(v, ["eyebrow", "title", "lead"]) &&
    count(v.items, 1, 3) &&
    listOf(
      v.items,
      (p) =>
        allStrings(p, ["title", "tag", "description"]) &&
        count(p.features, 1, 5) &&
        (p.features as unknown[]).every(isStr) &&
        typeof p.featured === "boolean" &&
        typeof p.coming_soon === "boolean"
    ),
  home_how: (v) =>
    isObj(v) &&
    allStrings(v, ["eyebrow", "title", "lead"]) &&
    count(v.steps, 3, 3) &&
    listOf(v.steps, (x) => isStr(x.title) && isStr(x.description)) &&
    isObj(v.cta) &&
    allStrings(v.cta, ["title", "text", "button"]),
  home_headings: (v) => isObj(v) && allStrings(v, ["contact_eyebrow", "contact_title", "contact_lead", "testimonials_eyebrow", "testimonials_title", "testimonials_lead"]),
  agreement_salary: () => false, // served by their own endpoint, never merged into the pages' content
  agreement_personal: () => false,
  privacy: policy,
  terms: policy,
  faq: (v) =>
    isObj(v) &&
    listOf(v.items, (f) => isStr(f.id) && isStr(f.q) && isStr(f.a) && (TOPICS as readonly unknown[]).includes(f.topic) && typeof f.popular === "boolean") &&
    (v.items as unknown[]).length > 0,
};

function merge(published: Published | undefined): SiteBlocks {
  const out = { ...DEFAULTS } as Record<string, unknown>;
  if (isObj(published)) {
    for (const key of Object.keys(SHAPE) as (keyof SiteBlocks)[]) if (SHAPE[key](published[key])) out[key] = published[key];
  }
  return out as unknown as SiteBlocks;
}

function remembered(): { at: number; blocks: Published } | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE) || "null");
    return isObj(saved) && typeof saved.at === "number" && isObj(saved.blocks) ? { at: saved.at, blocks: saved.blocks } : undefined;
  } catch {
    return undefined;
  }
}

export function useSiteContent(): SiteBlocks {
  const preview = previewMode();
  const saved = useMemo(() => (preview ? undefined : remembered()), [preview]);
  const { data } = useQuery({
    queryKey: [QUERY, preview],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ blocks: Published }>("/api/site-content", { params: preview ? { draft: 1 } : undefined });
      const blocks = isObj(data?.blocks) ? data.blocks : {};
      if (!preview) {
        try {
          localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), blocks }));
        } catch {
          /* storage is full or blocked: the next visit just fetches again */
        }
      }
      return blocks;
    },
    initialData: saved?.blocks,
    initialDataUpdatedAt: saved?.at,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  return useMemo(() => merge(data), [data]);
}

const digits = (number: string) => number.replace(/[^\d+]/g, "");

// The home page map has always searched for this shorter wording (it leaves out "Along"), so the unedited address keeps it.
// Once an admin changes the address, the map follows the new address.
const BUILT_IN_MAP_SEARCH = "Applewood+Adams,+Ngong+Road,+Nairobi";
const mapSearch = (address: string) =>
  address === DEFAULTS.contact.address ? BUILT_IN_MAP_SEARCH : encodeURIComponent(address).replace(/%20/g, "+").replace(/%2C/g, ",");

/** The contact details, ready for links and labels. */
export function useContact(): ContactView {
  const { contact } = useSiteContent();
  return useMemo(() => {
    const search = encodeURIComponent(contact.address);
    return {
      email: contact.email,
      phones: contact.phones.map((p) => ({ label: p.number, href: `tel:${digits(p.number)}` })),
      address: contact.address,
      mapsUrl: contact.maps_url || `https://www.google.com/maps/search/?api=1&query=${search}`,
      mapEmbedUrl: `https://maps.google.com/maps?q=${mapSearch(contact.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`,
      hours: contact.hours ?? DEFAULTS.contact.hours ?? "",
    };
  }, [contact]);
}
