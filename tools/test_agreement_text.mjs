// Tests for the loan agreement text the application forms show (frontend/src/lib/agreementText.ts).
//
//   node tools/test_agreement_text.mjs        (Node 22.6 or newer: it strips the TypeScript types itself)
//
// The same fixture and expected text are checked on the server side (backend/website/agreements.py render_text), so the form and the
// debt dossier can never show different wording for the same agreement.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const lib = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/src/lib");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "leocap-agreement-"));
fs.mkdirSync(path.join(tmp, "siteContent"));
fs.writeFileSync(path.join(tmp, "siteContent", "types.ts"), "export type AgreementBlock = unknown;\n");
fs.copyFileSync(path.join(lib, "agreementText.ts"), path.join(tmp, "agreementText.ts"));
const { agreementText, fillEmployer, agreementChanged } = await import(pathToFileURL(path.join(tmp, "agreementText.ts")).href);

let passed = 0;
const ok = (name, got, expected) => {
  assert.deepEqual(got, expected, `${name}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
  passed += 1;
  console.log(`ok   ${name.padEnd(62)} -> ${JSON.stringify(got).slice(0, 70)}`);
};

const fixture = {
  title: "LOAN AGREEMENT",
  intro: "Made in Nairobi.",
  items: [
    { title: "A. AMOUNT", body: "Line one\nLine two with {{employer}}\n\nLine four" },
    { title: "B. END", body: "The end." },
  ],
};
const expected = "LOAN AGREEMENT\n\nMade in Nairobi.\n\nA. AMOUNT\nLine one\nLine two with Savannah Ltd\n\nLine four\n\nB. END\nThe end.";

console.log("the text");
ok("title, intro, then each section's title and lines", agreementText(fixture, "Savannah Ltd"), expected);
ok("no trailing blank lines", agreementText(fixture, "Savannah Ltd").endsWith("The end."), true);
ok("no intro: no stray blank block", agreementText({ title: "T", intro: "", items: [{ title: "A", body: "x" }] }), "T\n\nA\nx");

console.log("\nthe employer");
ok("every {{employer}} is filled in", fillEmployer("a {{employer}} b {{employer}} c", "Ideon Limited"), "a Ideon Limited b Ideon Limited c");
ok("spaces inside the braces are fine", fillEmployer("{{ employer }} and {{employer }}", "X Ltd"), "X Ltd and X Ltd");
ok("no employer known: 'the Employer'", fillEmployer("under the MOU with {{employer}}.", ""), "under the MOU with the Employer.");
ok("an undefined employer too", fillEmployer("{{employer}}", undefined), "the Employer");
ok("a '$' in a name is not a replacement pattern", fillEmployer("{{employer}}", "A$&B $1 Ltd"), "A$&B $1 Ltd");
ok("other braces are left alone", fillEmployer("{{email}} stays", "X"), "{{email}} stays");
ok("the title is filled in too", agreementText({ title: "{{employer}} loan", intro: "", items: [] }, "Nakama Tech Limited").startsWith("Nakama Tech Limited loan"), true);

console.log("\nthe server saying the text changed");
ok("the server's message is recognised", agreementChanged("The loan agreement was updated while you were applying. Please read it again and accept it again."), true);
ok("another error is not", agreementChanged("Please enter a valid loan amount."), false);
ok("no message", agreementChanged(null), false);

console.log(`\n${passed} cases passed`);
