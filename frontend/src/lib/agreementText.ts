// The loan agreement as plain text, the way the application forms show it. Plain functions with no React in them, so they can be tested on
// their own (tools/test_agreement_text.mjs). The server's agreements.render_text builds the same text for the debt dossier.
import type { AgreementBlock } from "./siteContent/types";

/** What a form asks for to fill in "{{employer}}". */
const EMPLOYER = /\{\{\s*employer\s*\}\}/g;

/** The text with the borrower's employer put in where it says {{employer}} ("the Employer" when none is known). */
export function fillEmployer(text: string, employer?: string): string {
  const name = (employer ?? "").trim() || "the Employer";
  return (text ?? "").replace(EMPLOYER, () => name); // a function, so a "$" in a name is never read as a replacement pattern
}

/** Title, opening paragraph, then each section's title and lines, with a blank line between them. */
export function agreementText(data: AgreementBlock, employer?: string): string {
  const intro = fillEmployer(data.intro ?? "", employer);
  const parts: string[] = [fillEmployer(data.title, employer), ""];
  if (intro) parts.push(intro, ""); // no opening paragraph: no gap
  for (const section of data.items) parts.push(fillEmployer(section.title, employer), fillEmployer(section.body, employer), "");
  return parts.join("\n").replace(/\n+$/, "");
}

/** True when a server answer says the agreement was changed while the borrower was reading it (the form then reloads it and asks again). */
export const agreementChanged = (message?: string | null): boolean => /agreement was updated/i.test(message ?? "");
