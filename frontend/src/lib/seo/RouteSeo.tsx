import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { IS_DEMO } from "@/components/demo/demo";
import { useContact } from "@/lib/siteContent/useSiteContent";
import { APP_TITLE, normalizePath, PUBLIC_PAGES, SITE_NAME, SITE_URL, SOCIAL_IMAGE } from "./pages";

// Keeps the page title, description, canonical link and robots tag right as the visitor moves between pages (the first
// page's tags are already in the HTML: see vite-seo.ts). A page is "listed" only when it is a public page on the real address;
// the portals, the "not found" page, password reset, the app. address and the demo ask search engines to keep out.

// useSessionMetrics may put invisible characters in front of the title for a signed-in user: keep them.
const PREFIX = /^[​‌‍﻿]+/;

function setTag(selector: string, make: () => HTMLElement, attr: string, value: string | null) {
  let el = document.head.querySelector(selector);
  if (value === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = make();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const meta = (name: string) => () => Object.assign(document.createElement("meta"), { name });
const link = (rel: string) => () => Object.assign(document.createElement("link"), { rel });

/** The business, for search engines: built from the contact details on the site, so an edit in Site content is followed. */
function OrganizationData() {
  const contact = useContact();
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: SITE_NAME, inLanguage: "en-KE" },
      {
        "@type": "FinancialService",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/icon-512.png`,
        image: SITE_URL + SOCIAL_IMAGE.path,
        description: PUBLIC_PAGES["/"].description,
        email: contact.email,
        telephone: contact.phones.map((p) => p.href.replace(/^tel:/, "")),
        address: { "@type": "PostalAddress", streetAddress: contact.address, addressCountry: "KE" },
        areaServed: "KE",
      },
    ],
  });

  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = json;
    document.head.appendChild(el);
    return () => el.remove();
  }, [json]);

  return null;
}

export default function RouteSeo() {
  const path = normalizePath(useLocation().pathname);
  const page = PUBLIC_PAGES[path];
  const listed = !!page && !IS_DEMO && window.location.hostname === new URL(SITE_URL).hostname;

  useEffect(() => {
    document.title = (document.title.match(PREFIX)?.[0] ?? "") + (page?.title ?? APP_TITLE);
    setTag('meta[name="description"]', meta("description"), "content", page?.description ?? null);
    setTag('link[rel="canonical"]', link("canonical"), "href", listed ? SITE_URL + (path === "/" ? "/" : path) : null);
    setTag('meta[name="robots"]', meta("robots"), "content", listed ? null : "noindex");
  }, [path, page, listed]);

  return listed && path === "/" ? <OrganizationData /> : null;
}
