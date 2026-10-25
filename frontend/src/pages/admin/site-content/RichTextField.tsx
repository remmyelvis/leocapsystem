import { useRef, type MouseEvent } from "react";
import { Bold, Heading3, Link2, List, ListOrdered, MousePointerClick, SquareMousePointer } from "lucide-react";
import { Tip } from "@/components/ui/tooltip";
import { RichText } from "@/lib/siteContent/format";
import type { ContactView } from "@/lib/siteContent/types";
import { Field, inputClass } from "./fields";

// A text box for the site's small text format, with a toolbar that writes the marks for you and a live preview of
// what visitors will see. The format itself is described in lib/siteContent/format.tsx.

interface Edit {
  value: string;
  from: number;
  to: number;
}

const LIST_MARKS = /^(\d+\.|-|###)\s+/;

function wrapSelection(value: string, a: number, b: number, mark: string, placeholder: string): Edit {
  // Already wrapped: take the marks off again.
  if (a >= mark.length && value.slice(a - mark.length, a) === mark && value.slice(b, b + mark.length) === mark) {
    return { value: value.slice(0, a - mark.length) + value.slice(a, b) + value.slice(b + mark.length), from: a - mark.length, to: b - mark.length };
  }
  const text = value.slice(a, b) || placeholder;
  return { value: value.slice(0, a) + mark + text + mark + value.slice(b), from: a + mark.length, to: a + mark.length + text.length };
}

function makeLink(value: string, a: number, b: number): Edit {
  const text = value.slice(a, b) || "link text";
  const url = "https://";
  const start = a + text.length + 3; // after "[text]("
  return { value: value.slice(0, a) + `[${text}](${url})` + value.slice(b), from: start, to: start + url.length };
}

/** Bullets, numbers or a heading on every line touched by the selection; pressing it again takes them off. */
function markLines(value: string, a: number, b: number, kind: "ul" | "ol" | "h"): Edit {
  if (b > a && value[b - 1] === "\n") b -= 1;
  const start = value.lastIndexOf("\n", a - 1) + 1;
  let end = value.indexOf("\n", b);
  if (end < 0) end = value.length;
  const lines = value.slice(start, end).split("\n");
  const has = (l: string) => (kind === "ul" ? /^-\s+/ : kind === "ol" ? /^\d+\.\s+/ : /^###\s+/).test(l);
  const real = lines.filter((l) => l.trim());
  const remove = real.length > 0 && real.every(has);
  let n = 0;
  const out = lines.map((l) => {
    if (!l.trim() && lines.length > 1) return l;
    const bare = l.replace(LIST_MARKS, "");
    if (remove) return bare;
    return (kind === "ul" ? "- " : kind === "ol" ? `${++n}. ` : "### ") + bare;
  });
  const text = out.join("\n");
  return { value: value.slice(0, start) + text + value.slice(end), from: start, to: start + text.length };
}

/** Put a button or a ready-made block on a line of its own (after the line the cursor is on), with the part to type over selected. */
function insertBlock(value: string, a: number, b: number, block: string, select: string): Edit {
  const lineStart = value.lastIndexOf("\n", a - 1) + 1;
  let lineEnd = value.indexOf("\n", b);
  if (lineEnd < 0) lineEnd = value.length;
  const emptyLine = value.slice(lineStart, lineEnd).trim() === "";
  const head = emptyLine ? value.slice(0, lineStart) : value.slice(0, lineEnd) + "\n\n";
  const rest = value.slice(lineEnd);
  const tail = rest === "" || rest.startsWith("\n") ? "" : "\n\n";
  const at = head.length + block.indexOf(select);
  return { value: head + block + tail + rest, from: select ? at : head.length + block.length, to: select ? at + select.length : head.length + block.length };
}

function insertInline(value: string, a: number, b: number, text: string): Edit {
  return { value: value.slice(0, a) + text + value.slice(b), from: a + text.length, to: a + text.length };
}

const TOOL = "flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40";

export default function RichTextField({
  id,
  label,
  value,
  onChange,
  contact,
  max,
  hint,
  rows = 7,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  contact: ContactView;
  max: number;
  hint?: string;
  rows?: number;
}) {
  const box = useRef<HTMLTextAreaElement>(null);

  const apply = (make: (value: string, a: number, b: number) => Edit) => {
    const el = box.current;
    if (!el) return;
    const edit = make(value, el.selectionStart, el.selectionEnd);
    onChange(edit.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(edit.from, edit.to);
    });
  };

  const tools = [
    { label: "Bold (Ctrl+B)", icon: Bold, run: () => apply((v, a, b) => wrapSelection(v, a, b, "**", "bold text")) },
    { label: "Link (Ctrl+K)", icon: Link2, run: () => apply(makeLink) },
    { label: "Heading", icon: Heading3, run: () => apply((v, a, b) => markLines(v, a, b, "h")) },
    { label: "Bullet list", icon: List, run: () => apply((v, a, b) => markLines(v, a, b, "ul")) },
    { label: "Numbered steps", icon: ListOrdered, run: () => apply((v, a, b) => markLines(v, a, b, "ol")) },
    { label: "Button (solid)", icon: MousePointerClick, run: () => apply((v, a, b) => insertBlock(v, a, b, "[button: Label](/register)", "Label")) },
    { label: "Button (outline)", icon: SquareMousePointer, run: () => apply((v, a, b) => insertBlock(v, a, b, "[outline: Label](/login/applicant)", "Label")) },
  ];

  const placeholders: { text: string; token: string; own?: boolean }[] = [
    { text: "Email", token: "{{email}}" },
    { text: "Phone numbers", token: "{{phones}}" },
    { text: "Address", token: "{{address}}" },
    { text: "Documents checklist", token: "{{documents-checklist}}", own: true },
    { text: "Status guide", token: "{{status-guide}}", own: true },
  ];

  // The preview shows what a click would do without leaving the editor.
  const keepHere = (e: MouseEvent) => {
    if ((e.target as Element).closest("a")) e.preventDefault();
  };

  return (
    <Field label={label} htmlFor={id} count={{ n: value.length, max }}>
      <div className="grid gap-3 xl:grid-cols-2">
        <div>
          <div role="toolbar" aria-label={`${label}: formatting`} className="mb-1.5 flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-50 p-1 ring-1 ring-slate-200">
            {tools.map(({ label: name, icon: Icon, run }) => (
              <Tip key={name} label={name}>
                <button type="button" aria-label={name} onClick={run} className={TOOL}>
                  <Icon className="h-4 w-4" />
                </button>
              </Tip>
            ))}
          </div>
          <textarea
            id={id}
            ref={box}
            value={value}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
              if (e.key.toLowerCase() === "b") {
                e.preventDefault();
                tools[0].run();
              } else if (e.key.toLowerCase() === "k") {
                e.preventDefault();
                tools[1].run();
              }
            }}
            className={`${inputClass} resize-y font-mono leading-relaxed`}
            spellCheck
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-slate-500">Insert:</span>
            {placeholders.map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() => apply((v, a, b) => (p.own ? insertBlock(v, a, b, p.token, "") : insertInline(v, a, b, p.token)))}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[12px] font-medium text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
              >
                {p.text}
              </button>
            ))}
          </div>
          {hint && <p className="mt-1 text-[12px] leading-snug text-slate-500">{hint}</p>}
          <details className="mt-1.5 text-[12px] text-slate-600">
            <summary className="cursor-pointer select-none font-medium text-slate-700">Formatting help</summary>
            <ul className="mt-1.5 space-y-1 rounded-lg bg-slate-50 p-2.5 leading-snug ring-1 ring-slate-200">
              <li>A blank line starts a new paragraph.</li>
              <li>
                <code>**bold**</code> makes bold text. <code>[text](/faq#how)</code> links to a page or answer on this site; <code>[text](https://...)</code>, <code>mailto:</code> and <code>tel:</code> links work too.
              </li>
              <li>
                Start lines with <code>1. </code> for numbered steps, <code>- </code> for bullets, <code>### </code> for a small heading.
              </li>
              <li>
                <code>[button: Label](/register)</code> is a solid button, <code>[outline: Label](/login/applicant)</code> an outlined one. Put them on their own line.
              </li>
              <li>
                <code>{"{{email}}"}</code>, <code>{"{{phones}}"}</code> and <code>{"{{address}}"}</code> fill in the current contact details. <code>{"{{documents-checklist}}"}</code> and <code>{"{{status-guide}}"}</code> add the ready-made blocks and must be on a line of their own.
              </li>
            </ul>
          </details>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-slate-600">How it looks</p>
          <div onClickCapture={keepHere} className="space-y-3.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-700">
            {value.trim() ? <RichText source={value} contact={contact} /> : <p className="text-[13px] italic text-slate-400">Nothing to show yet.</p>}
          </div>
        </div>
      </div>
    </Field>
  );
}
