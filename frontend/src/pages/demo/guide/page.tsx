import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchGuide, signInLink, type GuideStory } from "@/components/demo/demo";

const first = (name: string) => name.split(" ")[0];

function Story({ n, s }: { n: number; s: GuideStory }) {
  return (
    <li className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F2C59] text-[14px] font-bold text-white">{n}</span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold leading-snug text-slate-900">{s.title}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-slate-700">{s.pitch}</p>
          <p className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">Sign in as {s.who.name}, {s.who.title}</p>
        </div>
      </div>
      <ol className="ml-[52px] mt-4 list-decimal space-y-1.5 pl-4 text-[14px] leading-relaxed text-slate-700 marker:font-semibold marker:text-slate-500">
        {s.steps.map((t) => <li key={t}>{t}</li>)}
      </ol>
      {s.links.length > 0 && (
        <div className="ml-[52px] mt-4 flex flex-wrap gap-2">
          {s.links.map((l, i) => (
            <Link
              key={l.path}
              to={signInLink(l.who, l.path)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                i === 0 ? "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600/40" : "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:ring-[#0F2C59]/40"
              }`}
            >
              {l.label}
              {l.who.key !== s.who.key && <span className="font-normal opacity-80">as {first(l.who.name)}</span>}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

export default function DemoGuidePage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["demo-guide"], queryFn: fetchGuide, retry: 2 });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white py-4">
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-6">
          <BrandLogo src="/logo-wordmark.png" height="2.25rem" />
          <Link to="/demo" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Choose a role
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-6 py-8">
        <h1 className="text-[26px] font-bold leading-tight text-slate-900">Presenter guide</h1>
        <p className="mt-1 max-w-[600px] text-[14px] leading-relaxed text-slate-600">
          Short stories, in the order that tends to win a room. Each button signs you in as the right person and opens the right page. Reset the demo from the Demo menu when you are done.
        </p>

        {isError ? (
          <div role="alert" className="mt-6 rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
            <p className="text-[14px] text-slate-700">The guide could not be loaded. The demo server may be waking up.</p>
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0F2C59] px-5 text-[14px] font-semibold text-white hover:bg-[#0b2247] disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Try again
            </button>
          </div>
        ) : (
          <ol className="mt-6 space-y-4" aria-label="Stories">
            {isLoading ? [0, 1, 2].map((i) => <li key={i}><Skeleton className="h-[200px] rounded-2xl" /></li>) : data?.map((s, i) => <Story key={s.key} n={i + 1} s={s} />)}
          </ol>
        )}
      </main>
    </div>
  );
}
