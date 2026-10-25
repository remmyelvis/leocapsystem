import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, RefreshCw } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPersonas, signInLink, type Persona, type PersonaRole } from "@/components/demo/demo";

const ROLE: Record<PersonaRole, { label: string; chip: string; avatar: string }> = {
  admin: { label: "Lender admin", chip: "bg-blue-50 text-blue-900 ring-blue-200", avatar: "bg-[#0F2C59] text-white" },
  hr: { label: "Employer HR", chip: "bg-emerald-50 text-emerald-900 ring-emerald-200", avatar: "bg-emerald-700 text-white" },
  finance: { label: "Employer finance", chip: "bg-amber-50 text-amber-950 ring-amber-200", avatar: "bg-amber-600 text-white" },
  borrower: { label: "Borrower", chip: "bg-slate-100 text-slate-800 ring-slate-300", avatar: "bg-slate-700 text-white" },
};

const GROUPS: { title: string; sub: string; roles: PersonaRole[] }[] = [
  { title: "The lender", sub: "The admin console: every borrower, loan, fee and report.", roles: ["admin"] },
  { title: "Employers", sub: "HR and finance staff see only their own company's people and loans.", roles: ["hr", "finance"] },
  { title: "Borrowers", sub: "What an applicant sees: their loans, what they owe and when.", roles: ["borrower"] },
];

const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function PersonaCard({ p }: { p: Persona }) {
  const role = ROLE[p.role];
  return (
    <li className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${role.avatar}`}>
          {initials(p.name)}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight text-slate-900">{p.name}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-600">
            {p.title}
            {p.company ? ` · ${p.company}` : ""}
          </p>
        </div>
      </div>
      <span className={`mt-3 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ${role.chip}`}>{role.label}</span>
      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-slate-600">{p.blurb}</p>
      <Link
        to={signInLink(p)}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:ring-offset-2"
      >
        Sign in as {p.name.split(" ")[0]}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </li>
  );
}

export default function DemoPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["demo-personas"], queryFn: fetchPersonas, retry: 2 });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#081430] bg-[radial-gradient(60%_80%_at_10%_0%,rgba(59,130,246,0.28),transparent_70%)] px-6 pb-12 pt-6 text-white">
        <div className="mx-auto max-w-[1040px]">
          <div className="flex items-center justify-between">
            <BrandLogo src="/logo-wordmark.png" height="2.25rem" />
            <div className="flex items-center gap-5">
              <Link to="/demo/guide" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-slate-200 transition-colors hover:text-white">
                <BookOpen className="h-3.5 w-3.5" /> Presenter guide
              </Link>
              <Link to="/" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-slate-200 transition-colors hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to site
              </Link>
            </div>
          </div>
          <p className="mt-10 inline-flex rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[12px] font-semibold tracking-wide">Demo environment</p>
          <h1 className="mt-4 max-w-[640px] text-[34px] font-bold leading-[1.15] tracking-[-0.015em]">See Leocap through each person's eyes</h1>
          <p className="mt-3 max-w-[600px] text-[15px] leading-relaxed text-slate-200">
            Pick a role and you are signed in at once. Every name, loan and message here is made up, so nothing you do touches a real person, real money or a real inbox.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1040px] px-6 pb-16 pt-10">
        {isError ? (
          <div role="alert" className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-[15px] font-semibold text-slate-900">The demo server is not answering yet</p>
            <p className="mt-1 text-[13px] text-slate-600">It sleeps when nobody has used it for a while. Give it a few seconds, then try again.</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0F2C59] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b2247] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Try again
            </button>
          </div>
        ) : (
          GROUPS.map((g) => {
            const people = data?.personas.filter((p) => g.roles.includes(p.role)) ?? [];
            if (!isLoading && !people.length) return null;
            return (
              <section key={g.title} className="mt-10 first:mt-0" aria-labelledby={`grp-${g.title}`}>
                <h2 id={`grp-${g.title}`} className="text-[18px] font-bold text-slate-900">{g.title}</h2>
                <p className="mt-0.5 text-[13px] text-slate-600">{g.sub}</p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {isLoading ? [0, 1, 2].map((i) => <li key={i}><Skeleton className="h-[230px] rounded-2xl" /></li>) : people.map((p) => <PersonaCard key={p.key} p={p} />)}
                </ul>
              </section>
            );
          })
        )}
        <p className="mt-10 text-center text-[12px] text-slate-600">Everyone using the demo shares the same data, so changes you make are seen by others until it is reset.</p>
      </main>
    </div>
  );
}
