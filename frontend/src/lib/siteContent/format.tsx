import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ActionLink, Actions, DOC_SUMMARY, DocChecklist, P, STATUS_SUMMARY, StatusGuide, Steps } from "@/components/faq/parts";
import type { ContactView } from "./types";

// The small text format editors write answers in. It is turned into the site's own components, never into raw HTML:
//
//   a blank line starts a new paragraph          **bold**          [link text](/page)
//   1. numbered steps (one per line)             - bullet points (one per line)
//   ### A small heading                          [button: Label](/page)   [outline: Label](/page)
//   {{email}} {{phones}} {{address}}  fill in the contact details
//   {{documents-checklist}}  {{status-guide}}    ready-made blocks, each alone on its line
//
// Links may point to a page on this site (starting with /) or start with https://, mailto: or tel:.
// The server checks the same rules when content is saved; they are checked again here before anything is drawn.

const URL_OK = /^(\/(?!\/)\S*|https:\/\/\S+|mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9]+)$/;
export const isSafeUrl = (url: string) => URL_OK.test(url.trim());

type Button = { label: string; url: string; primary: boolean };
type Node =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ol" | "ul"; items: string[] }
  | { t: "actions"; items: Button[] }
  | { t: "block"; name: "documents-checklist" | "status-guide" };

const BUTTON = /\[(button|outline):\s*([^\]\n]+?)\s*\]\(([^)\n]+)\)/g;
const BUTTON_LINE = /^(?:\[(?:button|outline):[^\]\n]*\]\([^)\n]*\)\s*)+$/;
const BLOCK_LINE = /^\{\{\s*(documents-checklist|status-guide)\s*\}\}$/;
const INLINE = /\*\*([^*\n]+?)\*\*|\[([^\]\n]+)\]\(([^)\n]+)\)|\{\{\s*(email|phones|address)\s*\}\}/g;

export function parse(source: string): Node[] {
  const nodes: Node[] = [];
  // The block being built. A list or a row of buttons carries on across a blank line; only a paragraph ends there.
  let last: Node | undefined;
  const start = (node: Node) => {
    nodes.push(node);
    return node;
  };

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      if (last?.t === "p") last = undefined;
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(BLOCK_LINE))) {
      last = start({ t: "block", name: m[1] as "documents-checklist" | "status-guide" });
    } else if ((m = line.match(/^###\s+(.+)$/))) {
      last = start({ t: "h", text: m[1] });
    } else if ((m = line.match(/^\d+\.\s+(.+)$/)) || (m = line.match(/^-\s+(.+)$/))) {
      const t = /^\d/.test(line) ? "ol" : "ul";
      if (last?.t === t) last.items.push(m[1]);
      else last = start({ t, items: [m[1]] });
    } else if (BUTTON_LINE.test(line)) {
      const items = Array.from(line.matchAll(BUTTON)).map((b) => ({ label: b[2], url: b[3].trim(), primary: b[1] === "button" }));
      if (last?.t === "actions") last.items.push(...items);
      else last = start({ t: "actions", items });
    } else if (last?.t === "p") {
      last.text += " " + line;
    } else {
      last = start({ t: "p", text: line });
    }
  }
  return nodes;
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

const LINK = "font-semibold text-brand-blue underline-offset-2 hover:underline";

function TextLink({ url, children }: { url: string; children: ReactNode }) {
  return url.startsWith("/") ? (
    <Link to={url} className={LINK}>
      {children}
    </Link>
  ) : (
    <a href={url} className={LINK} {...(url.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** Bold, links and the contact placeholders inside one line of text. */
function inline(text: string, contact: ContactView): ReactNode[] {
  const out: ReactNode[] = [];
  let from = 0;
  for (const m of Array.from(text.matchAll(INLINE))) {
    if (m.index! > from) out.push(text.slice(from, m.index));
    const key = out.length;
    if (m[1] !== undefined) {
      out.push(<strong key={key}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      out.push(isSafeUrl(m[3]) ? <TextLink key={key} url={m[3].trim()}>{m[2]}</TextLink> : m[2]);
    } else if (m[4] === "email") {
      out.push(
        <a key={key} href={`mailto:${contact.email}`} className={LINK}>
          {contact.email}
        </a>
      );
    } else if (m[4] === "phones") {
      out.push(
        <Fragment key={key}>
          {contact.phones.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " or "}
              <a href={p.href} className={LINK}>
                {p.label}
              </a>
            </span>
          ))}
        </Fragment>
      );
    } else {
      out.push(contact.address);
    }
    from = m.index! + m[0].length;
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}

export function RichText({ source, contact }: { source: string; contact: ContactView }) {
  return (
    <>
      {parse(source).map((n, i) => {
        switch (n.t) {
          case "p":
            return <P key={i}>{inline(n.text, contact)}</P>;
          case "h":
            return (
              <h4 key={i} className="pt-1 text-[15px] font-bold text-slate-900">
                {inline(n.text, contact)}
              </h4>
            );
          case "ol":
            return <Steps key={i} items={n.items.map((s) => inline(s, contact))} />;
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-slate-400">
                {n.items.map((s, j) => (
                  <li key={j}>{inline(s, contact)}</li>
                ))}
              </ul>
            );
          case "actions": {
            const shown = n.items.filter((b) => isSafeUrl(b.url));
            return shown.length === 0 ? null : (
              <Actions key={i}>
                {shown.map((b, j) => (
                  <ActionLink key={j} primary={b.primary} {...(b.url.startsWith("/") ? { to: b.url } : { href: b.url })}>
                    {b.label}
                  </ActionLink>
                ))}
              </Actions>
            );
          }
          case "block":
            return n.name === "documents-checklist" ? <DocChecklist key={i} /> : <StatusGuide key={i} />;
        }
      })}
    </>
  );
}

// ─── Plain text (what the FAQ search looks at and what search engines read) ─────────────────────────────────

function strip(text: string, contact: ContactView): string {
  return text.replace(INLINE, (_all, bold, label, _url, token) =>
    bold !== undefined ? bold : label !== undefined ? label : token === "email" ? contact.email : token === "phones" ? contact.phones.map((p) => p.label).join(" or ") : contact.address
  );
}

export function plainText(source: string, contact: ContactView): string {
  return parse(source)
    .map((n) => {
      switch (n.t) {
        case "p":
        case "h":
          return strip(n.text, contact);
        case "ol":
        case "ul":
          return n.items.map((s) => strip(s, contact)).join(" ");
        case "actions":
          return "";
        case "block":
          return n.name === "documents-checklist" ? DOC_SUMMARY : STATUS_SUMMARY;
      }
    })
    .filter(Boolean)
    .join(" ");
}
