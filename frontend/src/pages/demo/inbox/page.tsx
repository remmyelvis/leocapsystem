import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInbox, type DemoEmail } from "@/components/demo/demo";

const escape = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The message as a page of its own. It goes in a sandboxed frame (no scripts, no links out), so whatever a message contains cannot touch the demo. */
const document_ = (body: string) =>
  `<!doctype html><meta charset="utf-8"><base target="_blank"><body style="margin:16px;font:14px/1.6 system-ui,sans-serif;color:#1e293b">${
    /<[a-z][\s\S]*>/i.test(body) ? body : `<div style="white-space:pre-wrap">${escape(body)}</div>`
  }</body>`;

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export default function DemoInboxPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["demo-inbox"], queryFn: fetchInbox, refetchOnWindowFocus: true });
  const [picked, setPicked] = useState<string | null>(null);
  const emails = data ?? [];
  const current: DemoEmail | undefined = emails.find((m) => m.id === picked) ?? emails[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between">
          <BrandLogo src="/logo-wordmark.png" height="2.25rem" />
          <Link to="/demo" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Choose a role
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1040px] px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-slate-900">Demo inbox</h1>
            <p className="mt-1 max-w-[560px] text-[14px] leading-relaxed text-slate-600">The emails the platform would have sent. Nothing is delivered in the demo, so this is where you see them.</p>
          </div>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-[14px] font-semibold text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {isError ? (
          <p role="alert" className="mt-6 rounded-2xl bg-white p-6 text-center text-[14px] text-slate-700 ring-1 ring-slate-200">The inbox could not be loaded. Try Refresh in a few seconds.</p>
        ) : isLoading ? (
          <Skeleton className="mt-6 h-[420px] rounded-2xl" />
        ) : !emails.length ? (
          <div className="mt-6 rounded-2xl bg-white p-10 text-center ring-1 ring-slate-200">
            <Mail className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold text-slate-900">No emails yet</p>
            <p className="mt-1 text-[13px] text-slate-600">Run today's job, or act on an application, and the email appears here.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto rounded-2xl bg-white ring-1 ring-slate-200" aria-label="Emails">
              {emails.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(m.id)}
                    aria-current={m.id === current?.id}
                    className={`block min-h-[64px] w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F2C59]/40 ${m.id === current?.id ? "bg-blue-50/70" : ""}`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-slate-900">{m.subject}</span>
                      <span className="shrink-0 text-[12px] text-slate-600">{when(m.sent_at)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-600">To {m.to}</span>
                  </button>
                </li>
              ))}
            </ul>
            {current && (
              <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-[16px] font-bold text-slate-900">{current.subject}</h2>
                  <p className="mt-1 text-[13px] text-slate-600">To {current.to} · {when(current.sent_at)} · {current.purpose}</p>
                </div>
                <iframe title={`Email: ${current.subject}`} sandbox="" srcDoc={document_(current.body)} className="h-[380px] w-full" />
              </article>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
