import type { Faq } from "@/components/faq/faqData";
import { parsePay, estimate, kes, type Loan } from "./estimate";
import type { LeoMood } from "./leo";

// What Leo says. Nothing here calls a server or an AI model: a visitor taps a choice (or types) and gets a written answer.
// Answers about money, timing, documents and contact are not copied here: they are read from the FAQs and contact details an admin
// edits (Admin > Site content), through the `faq` block. The only numbers Leo ever states come from lib/loanCalculations.ts.

export interface Chip {
  label: string;
  /** The next step: a step name below ("advance", "ask:personal", "pay:advance:50000"). */
  go: string;
}

export type Block =
  | { t: "text"; s: string }
  | { t: "faq"; id: string }
  | { t: "docs" }
  | { t: "status" }
  | { t: "estimate"; loan: Loan; pay: number }
  | { t: "actions"; items: { label: string; to: string; primary?: boolean }[] }
  | { t: "contact" };

export interface Reply {
  mood: LeoMood;
  blocks: Block[];
  chips: Chip[];
  /** The next typed message is a pay figure for this loan. */
  expect?: Loan;
}

export interface Who {
  name?: string;
  signedIn: boolean;
  returning: boolean;
  profile?: { percent: number; complete: boolean; missing: string[] } | null;
}

export interface Ctx {
  who: Who;
  faqs: Faq[];
}

const CHIP = {
  advance: { label: "Cash before payday", go: "advance" },
  personal: { label: "A bigger loan", go: "personal" },
  numbers: { label: "Check my numbers", go: "estimate" },
  how: { label: "How do I apply?", go: "how" },
  docs: { label: "What do I need?", go: "docs" },
  fast: { label: "How fast is it?", go: "fast" },
  cost: { label: "What will it cost?", go: "cost" },
  safe: { label: "Is it safe?", go: "safe" },
  human: { label: "Talk to a person", go: "human" },
  status: { label: "What do the statuses mean?", go: "status" },
} satisfies Record<string, Chip>;

const text = (s: string): Block => ({ t: "text", s });
const faq = (c: Ctx, id: string): Block[] => (c.faqs.some((f) => f.id === id) ? [{ t: "faq", id }] : []);

/** The one next step for this person: create an account, finish the profile, or apply. */
function applyBlock(c: Ctx): Block {
  const { who } = c;
  if (!who.signedIn) {
    return { t: "actions", items: [{ label: "Create my account", to: "/register", primary: true }, ...(who.returning ? [{ label: "Sign in", to: "/login/applicant" }] : [])] };
  }
  if (!who.profile) return { t: "actions", items: [{ label: "Go to my dashboard", to: "/dashboard", primary: true }] };
  return who.profile.complete
    ? { t: "actions", items: [{ label: "Start an application", to: "/dashboard/apply", primary: true }] }
    : { t: "actions", items: [{ label: "Complete my profile", to: "/dashboard/profile", primary: true }] };
}

const MENU: Chip[] = [CHIP.advance, CHIP.personal, CHIP.numbers, CHIP.how, CHIP.safe, CHIP.human];

function start(c: Ctx): Reply {
  const { who } = c;
  if (who.signedIn) {
    const hi = who.name ? `Hi ${who.name.split(/\s+/)[0]}!` : "Hi!";
    const p = who.profile;
    const line =
      p && !p.complete
        ? `${hi} Your profile is **${p.percent}%** done.${p.missing.length ? ` Still to do: ${p.missing.slice(0, 3).join(", ")}${p.missing.length > 3 ? ` and ${p.missing.length - 3} more` : ""}.` : ""} Finish it and you can apply.`
        : p
          ? `${hi} Your profile is complete, so you can apply whenever you are ready.`
          : `${hi} I'm Leo. Ask me anything about applying.`;
    return { mood: "hello", blocks: [text(line), applyBlock(c)], chips: [CHIP.numbers, CHIP.docs, CHIP.status, CHIP.human] };
  }
  if (who.returning) {
    return { mood: "hello", blocks: [text("Welcome back! Ready to pick up where you left off?"), applyBlock(c)], chips: [CHIP.numbers, CHIP.fast, CHIP.human] };
  }
  return {
    mood: "hello",
    blocks: [text("Karibu! I'm **Leo**, Leocap's assistant. I can help you find the right loan and what you need to apply. What would you like to know?")],
    chips: MENU,
  };
}

function ask(loan: Loan): Reply {
  return {
    mood: "happy",
    expect: loan,
    blocks: [text("What's your **basic monthly pay** (KES)? A rough figure is fine, like 50,000 or 50k.")],
    chips: [30000, 50000, 80000, 120000].map((n) => ({ label: kes(n), go: `pay:${loan}:${n}` })),
  };
}

function result(loan: Loan, pay: number, c: Ctx): Reply {
  if (!estimate(loan, pay)) {
    return { mood: "thinking", blocks: [text("That's too low for me to work out a loan. If you think that's a mistake, our team can check.")], chips: [CHIP.human, { label: "Try another amount", go: `ask:${loan}` }] };
  }
  return {
    mood: "celebrating",
    blocks: [
      { t: "estimate", loan, pay },
      text("That's a quick estimate from one figure. Your application uses your last 3 months of basic pay, so the exact amounts can differ."),
      applyBlock(c),
    ],
    chips: [{ label: "Try another amount", go: `ask:${loan}` }, CHIP.fast, CHIP.docs],
  };
}

/** Leo's answer for a step. */
export function go(step: string, c: Ctx): Reply {
  const [name, a, b] = step.split(":");
  switch (name) {
    case "start":
      return start(c);
    case "advance":
      return {
        mood: "happy",
        blocks: [text("A **Salary Advance** is for staff of a partner company, for when payday feels far away. It is repaid from your next paycheck."), applyBlock(c)],
        chips: [{ label: "See what I could get", go: "ask:advance" }, CHIP.fast, CHIP.docs, { label: "Is my company a partner?", go: "partner" }],
      };
    case "partner":
      return {
        mood: "hello",
        blocks: [text("You choose your company when you create your account, and that decides which loan you see. If yours isn't listed, individuals can apply for a **Personal Loan**, or you can ask the team about adding your company.")],
        chips: [CHIP.personal, CHIP.human],
      };
    case "personal":
      return {
        mood: "happy",
        blocks: [text("A **Personal Loan** is for individuals. After you apply, we review it and set the interest rate. You see it on your dashboard and the loan only goes ahead if you accept."), applyBlock(c)],
        chips: [{ label: "See what I could get", go: "ask:personal" }, CHIP.fast, CHIP.docs, CHIP.cost],
      };
    case "fast":
      return { mood: "happy", blocks: [...faq(c, "time"), applyBlock(c)], chips: [CHIP.docs, CHIP.how, CHIP.numbers] };
    case "cost":
      return { mood: "hello", blocks: [...faq(c, "cost"), text("Want a quick idea of the numbers for you?")], chips: [CHIP.numbers, CHIP.safe, CHIP.how] };
    case "repay":
      return { mood: "hello", blocks: faq(c, "repay"), chips: [CHIP.cost, CHIP.how, CHIP.human] };
    case "installment":
      return { mood: "hello", blocks: faq(c, "installment"), chips: [CHIP.advance, CHIP.personal, CHIP.human] };
    case "safe":
      return {
        mood: "hello",
        blocks: [
          text("Fair question. You apply entirely online, with no paperwork and no branch visits. We handle your personal data under the Kenya Data Protection Act, 2019, and we never sell it."),
          { t: "actions", items: [{ label: "Read the Privacy Policy", to: "/privacy-policy" }] },
        ],
        chips: [CHIP.how, CHIP.cost, CHIP.human],
      };
    case "how":
      return { mood: "happy", blocks: faq(c, "how"), chips: [CHIP.docs, CHIP.numbers, CHIP.fast] };
    case "docs":
      return { mood: "hello", blocks: [{ t: "docs" }, applyBlock(c)], chips: [CHIP.how, CHIP.numbers, CHIP.human] };
    case "status":
      return {
        mood: "hello",
        blocks: [text("This is what each status on your dashboard means:"), { t: "status" }, { t: "actions", items: [{ label: c.who.signedIn ? "My applications" : "Sign in", to: c.who.signedIn ? "/dashboard/applications" : "/login/applicant", primary: true }] }],
        chips: [CHIP.human, CHIP.how],
      };
    case "password":
      return { mood: "hello", blocks: faq(c, "password"), chips: [CHIP.human, CHIP.how] };
    case "human":
      return { mood: "hello", blocks: [text("Of course. A real person can help with anything I can't."), ...faq(c, "contact"), { t: "contact" }], chips: [CHIP.how, CHIP.numbers] };
    case "who":
      return { mood: "hello", blocks: faq(c, "who"), chips: [CHIP.advance, CHIP.personal, CHIP.human] };
    case "estimate":
      return {
        mood: "happy",
        blocks: [text("Let's get you a quick estimate. Which loan are you looking at?")],
        chips: [
          { label: "Salary Advance", go: "ask:advance" },
          { label: "Personal Loan", go: "ask:personal" },
          { label: "Not sure", go: "who" },
        ],
      };
    case "ask":
      return ask(a as Loan);
    case "pay":
      return result(a as Loan, Number(b), c);
    case "thanks":
      return { mood: "wink", blocks: [text("Karibu sana! Anything else I can help with?")], chips: MENU };
    default:
      return {
        mood: "thinking",
        blocks: [text("Hmm, I'm not sure I've got that one. Here's what I can help with, or I can find you a person.")],
        chips: MENU,
      };
  }
}

// Typed messages: first the obvious intents (English, plus a little Swahili), then a search of the FAQs, else "not sure".
const INTENTS: [RegExp, string][] = [
  [/\b(thanks|thank you|asante|shukran)\b/, "thanks"],
  [/\b(hi|hello|hey|habari|sasa|mambo|niaje|karibu|good (morning|afternoon|evening))\b/, "start"],
  [/password|forgot|reset/, "password"],
  [/\b(call|phone|email|human|agent|person|someone|contact|whatsapp|speak|talk)\b/, "human"],
  [/safe|secure|legit|scam|trust|privacy|fraud|data protection/, "safe"],
  [/document|kra|payslip|statement|upload|national id|id copy|contract/, "docs"],
  [/status|track|pending|approved|declined|disbursed|review rate/, "status"],
  [/installment|instalment/, "installment"],
  [/how (fast|long|quick)|quick|fast|instant|when will|24 hours|disburse/, "fast"],
  [/repay|pay back|due date|deduct/, "repay"],
  [/cost|fee|interest|charge|expensive|cheap|rate/, "cost"],
  [/how much|estimate|calculat|eligible|qualify|limit|afford|can i get|numbers/, "estimate"],
  [/personal|bigger|business|self.?employed|mkopo mkubwa/, "personal"],
  [/advance|payday|salary|mshahara|cash|pesa|loan|mkopo|borrow/, "advance"],
  [/apply|register|sign ?up|log ?in|sign ?in|create (an )?account|join|get started|how do i/, "how"],
];

const STOP = new Set(["what", "when", "where", "which", "that", "this", "with", "have", "your", "from", "about", "does", "will", "need", "know", "tell", "please", "could", "would", "there"]);

function searchFaqs(input: string, c: Ctx): string | null {
  const words = input.toLowerCase().match(/[a-z]{4,}/g)?.filter((w) => !STOP.has(w)) ?? [];
  let best: { id: string; score: number } | null = null;
  for (const f of c.faqs) {
    const hay = `${f.q} ${f.text}`.toLowerCase();
    const score = words.filter((w) => hay.includes(w)).length;
    if (score >= 2 && (!best || score > best.score)) best = { id: f.id, score };
  }
  return best ? best.id : null;
}

/** Leo's answer to something typed. `expect` is set while he is waiting for a pay figure. */
export function understand(input: string, expect: Loan | undefined, c: Ctx): Reply {
  const t = input.trim();
  if (expect) {
    const pay = parsePay(t);
    if (typeof pay === "number") return result(expect, pay, c);
    if (pay === "low" || pay === "high") {
      return { ...ask(expect), blocks: [text(pay === "low" ? "That looks low for a monthly pay. Could you check it? Try something like 50,000 or 50k." : "That looks very high. Could you check it? Try something like 50,000 or 50k.")] };
    }
  }
  const lower = t.toLowerCase();
  const hit = INTENTS.find(([re]) => re.test(lower));
  if (hit) return go(hit[1], c);
  const id = searchFaqs(t, c);
  if (id) return { mood: "hello", blocks: [{ t: "faq", id }], chips: [CHIP.how, CHIP.numbers, CHIP.human] };
  return go("lost", c);
}
