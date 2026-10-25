import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, LayoutTemplate } from "lucide-react";
import { PAGE_FOR, siteContentApi, type BlockSummary } from "@/lib/siteContent/adminApi";
import { card, StatusBadge, when } from "./fields";

// The sections of the public pages an admin can edit. Each opens its own editor.

export default function SiteContentPage() {
  const [blocks, setBlocks] = useState<BlockSummary[] | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    siteContentApi.list().then(setBlocks, (e) => setProblem(e.message));
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <LayoutTemplate className="h-5 w-5 text-brand-blue" /> Site content
        </h1>
        <p className="mt-0.5 text-[13px] text-slate-500">Edit the words on the public pages. Changes stay private as a draft until you publish them, and every published version is kept in the history.</p>
      </div>

      {problem && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800 ring-1 ring-red-200">{problem}</p>}
      {!blocks && !problem && <p className="text-[13px] text-slate-500">Loading...</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        {blocks?.map((b) => (
          <li key={b.key} className={`${card} flex flex-col gap-3`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[13px] font-bold text-slate-900">{b.title}</h2>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[13px] leading-snug text-slate-600">{b.about}</p>
            <p className="text-[12px] leading-snug text-slate-500">
              {b.status === "draft" && b.draft_at && (
                <>
                  Draft saved by {b.draft_by} on {when(b.draft_at)}.{" "}
                </>
              )}
              {b.published_at ? (
                <>
                  Published by {b.published_by} on {when(b.published_at)}.
                </>
              ) : (
                "Not published yet: the site shows the text that came with it."
              )}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <Link to={`/admin/site-content/${b.key}`} className="rounded-lg bg-brand-blue px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:ring-offset-2">
                Edit
              </Link>
              <a
                href={PAGE_FOR[b.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
              >
                View on the site <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[12px] leading-snug text-slate-500">
        Not editable here: the home page headings and the privacy policy, which are still part of the app, and pictures, which cannot be uploaded from this page.
      </p>
    </div>
  );
}
