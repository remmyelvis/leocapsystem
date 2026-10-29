// Tests for the admin's paid / unpaid filter on All Applications (frontend/src/lib/repaymentFilter.ts): which loans count as unpaid or paid,
// what is left out on purpose, what is still owed and the counts shown in the option labels.
//
//   node tools/test_repayment_filter.mjs        (Node 22.6 or newer: it strips the TypeScript types itself)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const lib = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/src/lib");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "leocap-repay-"));
fs.copyFileSync(path.join(lib, "repaymentFilter.ts"), path.join(tmp, "repaymentFilter.ts"));
const { repaymentGroup, matchesRepayment, stillOwed, repaymentCounts, asRepaymentFilter } = await import(pathToFileURL(path.join(tmp, "repaymentFilter.ts")).href);

const row = (status, repaymentStatus, outstandingBalance = 0, repaymentAmount = 11000) => ({ status, repaymentStatus, outstandingBalance, repaymentAmount });
let passed = 0;
const ok = (name, got, expected) => {
  assert.deepEqual(got, expected, `${name}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
  passed += 1;
  console.log(`ok   ${name.padEnd(58)} -> ${JSON.stringify(got)}`);
};

console.log("which group a loan is in");
ok("paid out, nothing paid yet", repaymentGroup(row("disbursed", "unpaid")), "unpaid");
ok("paid out, part paid", repaymentGroup(row("disbursed", "partially_paid")), "part");
ok("paid out, late (delinquent)", repaymentGroup(row("disbursed", "delinquent")), "late");
ok("paid out, escalated", repaymentGroup(row("disbursed", "escalated")), "late");
ok("defaulted (its loan status is 'defaulted' too)", repaymentGroup(row("defaulted", "defaulted")), "late");
ok("paid out and repaid in full", repaymentGroup(row("disbursed", "paid")), "paid");
ok("a status written differently (Partially Paid, Disbursed)", repaymentGroup(row("Disbursed", "Partially Paid")), "part");
ok("an older loan with an odd repayment status", repaymentGroup(row("disbursed", "")), "unpaid");

console.log("\nleft out on purpose: repayment does not apply");
ok("waiting for review (starts as 'unpaid')", repaymentGroup(row("pending_processing", "unpaid")), null);
ok("approved, not paid out yet", repaymentGroup(row("approved", "unpaid")), null);
ok("rate waiting for the borrower", repaymentGroup(row("rate_set", "unpaid")), null);
ok("declined (keeps 'unpaid')", repaymentGroup(row("declined", "unpaid")), null);
ok("rejected (keeps 'unpaid')", repaymentGroup(row("rejected", "unpaid")), null);
ok("the borrower declined the rate", repaymentGroup(row("rate_declined", "unpaid")), null);
ok("written off (marked paid, never repaid)", repaymentGroup(row("written_off", "paid")), null);

console.log("\nthe filter");
const all = [
  row("disbursed", "unpaid"), row("disbursed", "partially_paid"), row("disbursed", "delinquent"), row("defaulted", "defaulted"),
  row("disbursed", "paid"), row("disbursed", "paid"), row("pending_processing", "unpaid"), row("declined", "unpaid"), row("written_off", "paid"),
];
const pick = (f) => all.filter((a) => matchesRepayment(a, f)).length;
ok("All repayments keeps every row", pick("all"), 9);
ok("All unpaid = nothing paid + part paid + late", pick("owing"), 4);
ok("Nothing paid yet", pick("unpaid"), 1);
ok("Part paid", pick("part"), 1);
ok("Late or in default", pick("late"), 2);
ok("Paid in full (the written-off loan is not in it)", pick("paid"), 2);
ok("the pending and declined 'unpaid' are in no unpaid option", all.filter((a) => a.status === "pending_processing" || a.status === "declined").some((a) => matchesRepayment(a, "owing") || matchesRepayment(a, "unpaid")), false);

console.log("\nwhat is still owed");
ok("tracked balance wins (part paid)", stillOwed(row("disbursed", "partially_paid", 4000, 11000)), 4000);
ok("no balance tracked: the repayment amount", stillOwed(row("disbursed", "unpaid", 0, 11000)), 11000);
ok("late loan with fees in the balance", stillOwed(row("disbursed", "delinquent", 14850, 11000)), 14850);
ok("repaid loan owes nothing", stillOwed(row("disbursed", "paid", 0, 11000)), 0);
ok("a waiting application owes nothing yet", stillOwed(row("pending_processing", "unpaid", 11000, 11000)), 0);
ok("written off owes nothing", stillOwed(row("written_off", "paid", 0, 11000)), 0);

console.log("\ncounts for the option labels");
ok("counts", repaymentCounts(all), { all: 9, owing: 4, unpaid: 1, part: 1, late: 2, paid: 2 });
ok("no rows", repaymentCounts([]), { all: 0, owing: 0, unpaid: 0, part: 0, late: 0, paid: 0 });

console.log("\nthe address bar");
ok("a good value", asRepaymentFilter("late"), "late");
ok("every option is accepted", ["all", "owing", "unpaid", "part", "late", "paid"].map(asRepaymentFilter), ["all", "owing", "unpaid", "part", "late", "paid"]);
ok("missing", asRepaymentFilter(null), "all");
ok("something else", asRepaymentFilter("<script>"), "all");

console.log(`\n${passed} cases passed`);
