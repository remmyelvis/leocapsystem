import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { APP_TITLE, PUBLIC_PAGES, SITE_NAME, SITE_URL, SOCIAL_IMAGE } from './src/lib/seo/pages';

// Writes the search / link-preview tags into the page <head> at build time, so they are in the raw HTML that crawlers and
// link-preview bots read (they do not run the app). index.html holds a marker pair; the home page's tags go between the markers.
// After the build, every other public page gets its own copy of index.html with its own tags (dist/faq.html, ...), which the
// server hands out for /faq (see public/.htaccess; /login/applicant is login-applicant.html). The app itself changes the same tags while it runs (src/lib/seo/RouteSeo.tsx).
//
// The demo build gets no canonical / preview tags and tells search engines to keep out.

const START = '<!--seo:start-->';
const END = '<!--seo:end-->';
const BLOCK = new RegExp(`${START}[\\s\\S]*?${END}`);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function tags(page: string, demo: boolean): string {
  const seo = PUBLIC_PAGES[page];
  if (demo || !seo) {
    return `<title>${APP_TITLE}</title>\n    <meta name="robots" content="noindex" />`;
  }
  const url = SITE_URL + (page === '/' ? '/' : page);
  const image = SITE_URL + SOCIAL_IMAGE.path;
  return [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_KE" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="${SOCIAL_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${SOCIAL_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${esc(SOCIAL_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join('\n    ');
}

const fill = (html: string, page: string, demo: boolean) => html.replace(BLOCK, `${START}\n    ${tags(page, demo)}\n    ${END}`);

export default function seoHead(demo: boolean): Plugin {
  let outDir = '';
  let building = false;
  // the dev server and the demo build are never for search engines
  const hidden = () => demo || !building;
  return {
    name: 'leocap-seo-head',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      building = config.command === 'build';
    },
    transformIndexHtml: (html) => fill(html, '/', hidden()),
    closeBundle() {
      if (hidden()) return;
      const home = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      if (!BLOCK.test(home)) throw new Error('seo-head: the markers are missing from index.html');
      for (const page of Object.keys(PUBLIC_PAGES)) {
        if (page === '/') continue;
        // flat file names (login-applicant.html): a folder called login would swallow the app's /login address
        fs.writeFileSync(path.join(outDir, `${page.slice(1).replace('/', '-')}.html`), fill(home, page, false));
      }
    },
  };
}
