import type { Testimonial } from "./testimonials";

// Sample text so the design can be reviewed on a developer's machine. It is never included in a production build.
// The wording comes from the placeholder quotes that were in the code before; they are NOT confirmed as real.
export const SAMPLES: Testimonial[] = [
  {
    name: "Wanjiku Muthoni",
    role: "Accountant, Ideon Limited",
    quote:
      "I needed school fees urgently and Leocap approved my salary advance in just 4 hours. The whole process was on my phone — no paperwork, no stress whatsoever.",
    verified: false,
    product: "Salary Advance",
    status: "disbursed",
    outcome: "Approved in 4 hours",
  },
  {
    name: "Brian Ochieng",
    role: "Sales Executive, Nakama Group",
    quote:
      "Finally a lender that understands salaried employees. The rates are fair, the team is responsive, and the app is dead simple to use. I've recommended it to my whole department.",
    verified: false,
  },
  {
    name: "Aisha Abdi",
    role: "Consultant, Nairobi",
    quote:
      "Got a personal loan of KES 200,000 for my business expansion. The process took two days and the repayment plan is very manageable. Excellent service.",
    verified: false,
    product: "Personal Loan",
    status: "disbursed",
    outcome: "Two days start to finish",
  },
  {
    name: "Sample Person",
    role: "Teacher, Nairobi",
    quote: "A short sample quote, only here so the layout with four testimonials can be previewed.",
    verified: false,
  },
];
