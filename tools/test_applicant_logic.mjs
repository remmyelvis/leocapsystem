// Tests for what the applicant's pages say: the home page's "next step" (frontend/src/lib/nextStep.ts) and the application page's progress
// card (frontend/src/lib/loanProgress.ts). Both are plain functions, so every state is checked here, not by hand.
//
//   node tools/test_applicant_logic.mjs        (Node 22.6 or newer: it strips the TypeScript types itself)
//
// The two files import each other without a file extension (as the app's bundler wants) and Node needs one, so this runs them from a temporary copy.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";

const lib = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/src/lib");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "leocap-logic-"));
fs.copyFileSync(path.join(lib, "nextStep.ts"), path.join(tmp, "nextStep.ts"));
fs.writeFileSync(path.join(tmp, "loanProgress.ts"), fs.readFileSync(path.join(lib, "loanProgress.ts"), "utf8").replace('from "./nextStep"', 'from "./nextStep.ts"'));
const { nextStep, daysUntil, money, loanGroup, dueChip } = await import(pathToFileURL(path.join(tmp, "nextStep.ts")).href);
const { loanProgress } = await import(pathToFileURL(path.join(tmp, "loanProgress.ts")).href);

console.log("home page: the next step");
{

const now = new Date(2026, 9, 28, 23, 59); // 28 Oct 2026, one minute to midnight (the day boundary case)
const done = { isComplete: true, percent: 100, missing: [] };
const half = { isComplete: false, percent: 50, missing: ['KRA PIN', 'ID copy'] };
let n = 0;
const app = (o) => ({ id: 'a' + ++n, status: 'disbursed', amountApplied: 20000, repaymentAmount: 19800, repaymentStatus: 'unpaid', dueDate: '2026-11-04', submittedAt: '2026-10-12', ...o });
const t = (name, got, exp) => { for (const [k, v] of Object.entries(exp)) assert.deepEqual(got[k], v, `${name}: ${k} = ${JSON.stringify(got[k])}, expected ${JSON.stringify(v)}`); console.log('ok  ', name, '->', got.key, '|', got.title, '|', got.tone); };

assert.equal(daysUntil('2026-11-04', now), 7);
assert.equal(daysUntil('2026-10-28', now), 0);
assert.equal(daysUntil('2026-10-25', now), -3);
assert.equal(money(19800), 'KES 19,800'); assert.equal(money(19800.5), 'KES 19,800.50'); assert.equal(money(1250000), 'KES 1,250,000');

t('due in 7 days (navy)', nextStep([app()], done, now), { key: 'due', tone: 'navy', title: 'KES 19,800 due in 7 days' });
t('due in 3 days (amber)', nextStep([app({ dueDate: '2026-10-31' })], done, now), { key: 'due', tone: 'amber', title: 'KES 19,800 due in 3 days' });
t('due tomorrow', nextStep([app({ dueDate: '2026-10-29' })], done, now), { title: 'KES 19,800 due tomorrow' });
t('due today', nextStep([app({ dueDate: '2026-10-28' })], done, now), { title: 'KES 19,800 due today', tone: 'amber' });
t('owing, due in 20 days', nextStep([app({ dueDate: '2026-11-17' })], done, now), { key: 'owing', title: 'You owe KES 19,800', tone: 'navy' });
t('owing, no date', nextStep([app({ dueDate: undefined })], done, now), { key: 'owing', body: 'Your due date shows here once it is set.' });
t('two loans: total owed, first due date', nextStep([app({ dueDate: '2026-12-01' }), app({ dueDate: '2026-12-10', repaymentAmount: 5000 })], done, now), { key: 'owing', title: 'You owe KES 24,800', cta: { label: 'View loans', to: '/dashboard/applications' } });
t('two loans same due date: summed', nextStep([app({ dueDate: '2026-10-30' }), app({ dueDate: '2026-10-30', repaymentAmount: 5000 })], done, now), { key: 'due', title: 'KES 24,800 due in 2 days' });
t('overdue', nextStep([app({ dueDate: '2026-10-25' })], done, now), { key: 'overdue', tone: 'red', title: 'KES 19,800 is overdue', body: 'It was due on 25 Oct 2026 (3 days ago). Please repay as soon as you can.' });
t('overdue by repayment status only', nextStep([app({ repaymentStatus: 'delinquent', dueDate: '2026-11-10' })], done, now), { key: 'overdue' });
t('loan status defaulted', nextStep([app({ status: 'defaulted', dueDate: undefined })], done, now), { key: 'overdue', body: 'Please repay as soon as you can.' });
t('paid loan is not owed', nextStep([app({ repaymentStatus: 'paid' })], done, now), { key: 'again' });
t('paid loan, fully_paid spelling', nextStep([app({ repaymentStatus: 'fully_paid' })], done, now), { key: 'again' });
t('rate set beats overdue', nextStep([app({ dueDate: '2026-10-25' }), app({ status: 'rate_set', id: 'r1' })], done, now), { key: 'rate', cta: { label: 'Review rate', to: '/dashboard/applications/r1' } });
t('two rates', nextStep([app({ status: 'RATE_SET' }), app({ status: 'rate_set' })], done, now), { key: 'rate', title: '2 loans need your decision' });
t('approved', nextStep([app({ status: 'APPROVED', amountApplied: 100000 })], done, now), { key: 'approved', body: 'KES 100,000: we are preparing your payout.' });
t('pending', nextStep([app({ status: 'pending' })], done, now), { key: 'review', body: 'KES 20,000, submitted 12 Oct 2026. You can follow it here at any time.' });
t('amended counts as in review', nextStep([app({ status: 'Amended' })], done, now), { key: 'review' });
t('rate accepted counts as in review', nextStep([app({ status: 'rate_confirmed' })], done, now), { key: 'review' });
t('no loans, profile incomplete', nextStep([], half, now), { key: 'profile', profile: half });
t('no loans, profile complete', nextStep([], done, now), { key: 'ready' });
t('owing beats incomplete profile', nextStep([app()], half, now), { key: 'due' });
t('in review beats incomplete profile', nextStep([app({ status: 'pending' })], half, now), { key: 'review' });
t('profile beats declined and again', nextStep([app({ status: 'declined' })], half, now), { key: 'profile' });
t('declined last', nextStep([app({ status: 'declined' })], done, now), { key: 'declined', cta: { label: 'Apply for a loan', to: '/dashboard/apply' } });
t('rate declined last', nextStep([app({ status: 'rate_declined' })], done, now), { key: 'declined' });
t('older declined, newer repaid: again', nextStep([app({ status: 'declined', submittedAt: '2026-01-01' }), app({ repaymentStatus: 'paid', submittedAt: '2026-06-01' })], done, now), { key: 'again' });
const lim = { isComplete: true, percent: 100, loanLimit: 150000, missing: [] };
t('ready, with a limit', nextStep([], lim, now), { key: 'ready', body: 'Your details are already filled in, so applying is quick. You can apply for up to KES 150,000.' });
t('again, with a limit', nextStep([app({ repaymentStatus: 'paid' })], lim, now), { key: 'again', body: 'Your profile is complete. Apply whenever you are ready. You can apply for up to KES 150,000.' });
t('limit 0 or missing says nothing', nextStep([], { ...lim, loanLimit: 0 }, now), { body: 'Your details are already filled in, so applying is quick.' });
t('limit null says nothing', nextStep([], { ...lim, loanLimit: null }, now), { body: 'Your details are already filled in, so applying is quick.' });
t('again: starts from the newest repaid loan', nextStep([app({ id: 'old', repaymentStatus: 'paid', submittedAt: '2026-03-01' }), app({ id: 'new', repaymentStatus: 'paid', submittedAt: '2026-08-01' }), app({ id: 'dec', status: 'declined', submittedAt: '2026-05-01' })], { ...done, loanLimit: null }, now), { key: 'again', cta: { label: 'Apply again', to: '/dashboard/apply?again=new' } });
t('again: only a decline in the past is not "again"', nextStep([app({ id: 'dec', status: 'declined' })], done, now), { key: 'declined', cta: { label: 'Apply for a loan', to: '/dashboard/apply' } });
t('written off: neutral, not an invitation', nextStep([app({ status: 'written_off' })], done, now), { key: 'again', title: 'Please get in touch about your account', cta: { label: 'Contact us', to: '/#contact' } });
t('overdue uses the balance after part payments and fees', nextStep([app({ repaymentStatus: 'delinquent', dueDate: '2026-09-23', repaymentAmount: 44000, outstandingAmount: 34500 })], done, now), { key: 'overdue', title: 'KES 34,500 is overdue' });
t('part paid: owes the balance', nextStep([app({ repaymentStatus: 'partially_paid', dueDate: '2026-12-10', repaymentAmount: 19800, outstandingAmount: 5000 })], done, now), { key: 'owing', title: 'You owe KES 5,000' });
t('unpaid ignores a stale balance', nextStep([app({ repaymentStatus: 'unpaid', dueDate: '2026-12-10', repaymentAmount: 19800, outstandingAmount: 0 })], done, now), { key: 'owing', title: 'You owe KES 19,800' });
t('part paid but balance missing: falls back', nextStep([app({ repaymentStatus: 'partially_paid', dueDate: '2026-12-10', repaymentAmount: 19800 })], done, now), { title: 'You owe KES 19,800' });
console.log('\nall', n, 'loans built, every assertion passed');

}

console.log("\napplication page: where the loan is");
{
const now = new Date(2026, 9, 28, 14, 0);
const st = (p) => p.steps.map((s) => ({ done: '●', current: '◐', todo: '○', stopped: '✕' })[s.state]).join('');
const t = (name, got, exp) => { for (const [k, v] of Object.entries(exp)) assert.deepEqual(k === 'steps' ? st(got) : got[k], v, `${name}: ${k} = ${JSON.stringify(k === 'steps' ? st(got) : got[k])}, expected ${JSON.stringify(v)}`); console.log('ok  ', name.padEnd(34), st(got), got.tone.padEnd(5), '|', got.title); };
t('pending', loanProgress({ status: 'PENDING' }, now), { steps: '●◐○○○', tone: 'navy', title: 'We are reviewing your application' });
t('unknown status = still in review', loanProgress({ status: 'amended' }, now), { steps: '●◐○○○' });
t('rate set: action', loanProgress({ status: 'RATE_SET' }, now), { steps: '●◐○○○', tone: 'amber', cta: { label: 'Review rate', anchor: 'rate-review' } });
t('rate accepted', loanProgress({ status: 'rate_confirmed' }, now), { steps: '●●◐○○', title: 'Waiting for approval' });
t('confirmed', loanProgress({ status: 'CONFIRMED' }, now), { steps: '●●◐○○' });
t('approved', loanProgress({ status: 'APPROVED' }, now), { steps: '●●●◐○', tone: 'green' });
t('declined', loanProgress({ status: 'DECLINED' }, now), { steps: '●✕○○○', tone: 'red', cta: { label: 'Apply again', to: '/dashboard/apply' } });
t('rate declined', loanProgress({ status: 'rate_declined' }, now), { steps: '●✕○○○', title: 'You declined the rate' });
t('paid out, due in 7 days', loanProgress({ status: 'DISBURSED', paymentStatus: 'UNPAID', dueDate: '2026-11-04', owed: 19800 }, now), { steps: '●●●●◐', tone: 'navy', title: 'KES 19,800 to repay by 4 Nov 2026', body: 'That is in 7 days.' });
t('paid out, due in 2 days: amber', loanProgress({ status: 'DISBURSED', paymentStatus: 'UNPAID', dueDate: '2026-10-30', owed: 19800 }, now), { tone: 'amber', body: 'That is in 2 days.' });
t('paid out, due today: amber', loanProgress({ status: 'DISBURSED', paymentStatus: 'UNPAID', dueDate: '2026-10-28', owed: 19800 }, now), { tone: 'amber', body: 'That is today.' });
t('part paid', loanProgress({ status: 'DISBURSED', paymentStatus: 'PARTIALLY_PAID', dueDate: '2026-11-20', owed: 5000 }, now), { title: 'KES 5,000 left to repay by 20 Nov 2026' });
t('overdue by date', loanProgress({ status: 'DISBURSED', paymentStatus: 'UNPAID', dueDate: '2026-10-25', owed: 19800 }, now), { tone: 'red', title: 'KES 19,800 is overdue', body: 'It was due on 25 Oct 2026 (3 days ago). Please repay as soon as you can.' });
t('overdue by status, no date', loanProgress({ status: 'disbursed', paymentStatus: 'DELINQUENT', owed: 44000 }, now), { tone: 'red', title: 'KES 44,000 is overdue', body: 'Please repay as soon as you can.' });
t('paid out, no due date', loanProgress({ status: 'DISBURSED', paymentStatus: 'UNPAID', owed: 100 }, now), { title: 'You owe KES 100', body: 'Your due date shows here once it is set.' });
t('paid out, nothing known', loanProgress({ status: 'DISBURSED' }, now), { title: 'Your loan is paid out' });
t('fully repaid: apply again from this loan', loanProgress({ id: 'abc', status: 'DISBURSED', paymentStatus: 'FULLY_PAID' }, now), { cta: { label: 'Apply again', to: '/dashboard/apply?again=abc' } });
t('fully repaid, no id: plain apply', loanProgress({ status: 'DISBURSED', paymentStatus: 'FULLY_PAID' }, now), { cta: { label: 'Apply again', to: '/dashboard/apply' } });
t('fully repaid: all done', loanProgress({ status: 'DISBURSED', paymentStatus: 'FULLY_PAID', dueDate: '2026-10-01' }, now), { steps: '●●●●●', tone: 'green', title: 'Fully repaid. Thank you!', reached: 5 });
console.log('\nall tracker cases passed');

}

console.log("\nthe four groups and the due label (home counts, applications list)");
{
  const g = (name, got, exp) => { assert.equal(got, exp, `${name}: ${got}, expected ${exp}`); console.log("ok  ", name.padEnd(40), "->", got); };
  g("paid out, unpaid", loanGroup("disbursed", "unpaid"), "active");
  g("paid out, part paid", loanGroup("DISBURSED", "partially_paid"), "active");
  g("paid out, overdue", loanGroup("disbursed", "delinquent"), "active");
  g("defaulted loan is still being repaid", loanGroup("defaulted", "unpaid"), "active");
  g("paid out, repaid", loanGroup("disbursed", "paid"), "repaid");
  g("paid out, fully_paid spelling", loanGroup("disbursed", "fully_paid"), "repaid");
  for (const st of ["pending", "pending_processing", "amended", "rate_set", "rate_confirmed", "confirmed", "approved"]) g(`${st} is in progress (never "repaid")`, loanGroup(st, "unpaid"), "progress");
  for (const st of ["declined", "rejected", "rate_declined"]) g(`${st} is declined (its repayment status stays "unpaid")`, loanGroup(st, "unpaid"), "declined");
  g("written off is none of the four", loanGroup("written_off", "unpaid"), "other");
  const now = new Date(2026, 9, 28, 23, 59);
  const c = (name, got, exp) => { assert.deepEqual(got, exp, `${name}: ${JSON.stringify(got)}`); console.log("ok  ", name.padEnd(40), "->", got && got.text); };
  c("no due date", dueChip(undefined, now), null);
  c("due in 7 days", dueChip("2026-11-04", now), { text: "Due 4 Nov 2026", tone: "navy" });
  c("due in 3 days", dueChip("2026-10-31", now), { text: "Due in 3 days", tone: "amber" });
  c("due tomorrow", dueChip("2026-10-29", now), { text: "Due tomorrow", tone: "amber" });
  c("due today", dueChip("2026-10-28", now), { text: "Due today", tone: "amber" });
  c("1 day late", dueChip("2026-10-27", now), { text: "Overdue 1 day", tone: "red" });
  c("35 days late", dueChip("2026-09-23", now), { text: "Overdue 35 days", tone: "red" });
}

fs.rmSync(tmp, { recursive: true, force: true });
