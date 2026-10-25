import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, Eye, History, LoaderCircle, Rocket, RotateCcw, Save, Undo2 } from "lucide-react";
import { ModalShell } from "@/components/ui/modal";
import { DEFAULTS } from "@/lib/siteContent/defaults";
import { useContact } from "@/lib/siteContent/useSiteContent";
import { PAGE_FOR, siteContentApi, type BlockDetail, type BlockKey, type Version } from "@/lib/siteContent/adminApi";
import { newKey, StatusBadge, when } from "../fields";
import { BannerForm, ContactForm, FaqForm, TestimonialsForm, type ContactValue, type FaqValue, type TestimonialsValue } from "../forms";
import { HeadingsForm, HeroForm, HowForm, PolicyForm, ProductsForm, type PolicyValue, type ProductsValue } from "../homeForms";

// The editor for one section. The working copy lives here; nothing reaches visitors until "Publish".
// Edits that are not saved yet are also kept in this tab (sessionStorage), so a click on another menu item cannot lose them.

const KEYS: BlockKey[] = ["banner", "contact", "home_hero", "home_products", "home_how", "home_headings", "testimonials", "faq", "privacy"];

/** The block without the helper keys the lists carry on screen. */
const strip = (v: unknown) => JSON.parse(JSON.stringify(v, (k, x) => (k === "_k" || k === "_auto" ? undefined : x)));
const json = (v: unknown) => JSON.stringify(strip(v));

function withKeys(key: BlockKey, source: unknown): any {
  const copy = JSON.parse(JSON.stringify(source));
  const tag = (list: any[]) => list.map((row) => ({ ...row, _k: newKey() }));
  if (key === "contact") copy.phones = tag(copy.phones);
  if (key === "testimonials" || key === "faq" || key === "home_products" || key === "privacy") copy.items = tag(copy.items);
  return copy;
}

interface Trouble {
  message: string;
  errors: string[];
  status?: number;
}

function Btn({ children, onClick, variant = "secondary", busy, disabled }: { children: ReactNode; onClick: () => void; variant?: "primary" | "secondary" | "danger"; busy?: boolean; disabled?: boolean }) {
  const look = {
    primary: "bg-brand-blue text-white hover:bg-slate-800",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 focus-visible:ring-offset-1 disabled:cursor-default disabled:opacity-45 ${look}`}
    >
      {children}
    </button>
  );
}

function Confirm({ title, children, label, danger, busy, onConfirm, onCancel }: { title: string; children: ReactNode; label: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalShell titleId="confirm-title" onClose={onCancel}>
      <h2 id="confirm-title" className="text-[15px] font-bold text-slate-900">
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-[13px] leading-snug text-slate-600">{children}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm} busy={busy}>
          {label}
        </Btn>
      </div>
    </ModalShell>
  );
}

export default function SiteContentEditorPage() {
  const { key } = useParams();
  return KEYS.includes(key as BlockKey) ? <Editor blockKey={key as BlockKey} /> : <Navigate to="/admin/site-content" replace />;
}

type Asking = "publish" | "discard" | "reset" | null;

function Editor({ blockKey }: { blockKey: BlockKey }) {
  const contact = useContact();
  const [detail, setDetail] = useState<BlockDetail | null>(null);
  const [data, setData] = useState<any>(null);
  const [base, setBase] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [asking, setAsking] = useState<Asking>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [recovered, setRecovered] = useState(false);
  const backupKey = `leocap.siteEdit.${blockKey}`;

  const show = (d: BlockDetail, restoreEdits = false) => {
    const fresh = withKeys(blockKey, d.draft ?? d.published ?? DEFAULTS[blockKey]);
    let working = fresh;
    if (restoreEdits) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(backupKey) || "null");
        // Only edits made on top of the very version that is on the server now.
        if (saved && saved.draftAt === d.draft_at && saved.publishedAt === d.published_at && JSON.stringify(saved.data) !== json(fresh)) {
          working = withKeys(blockKey, saved.data);
          setRecovered(true);
        }
      } catch {
        /* no backup */
      }
    }
    setDetail(d);
    setData(working);
    setBase(json(fresh));
    setTrouble(null);
  };

  useEffect(() => {
    siteContentApi.get(blockKey).then((d) => show(d, true), (e) => setLoadError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockKey]);

  const dirty = data !== null && json(data) !== base;

  // Keep unsaved edits in this tab, and warn before the tab is closed or reloaded with unsaved edits.
  useEffect(() => {
    if (!detail) return;
    const timer = window.setTimeout(() => {
      try {
        if (dirty) sessionStorage.setItem(backupKey, JSON.stringify({ draftAt: detail.draft_at, publishedAt: detail.published_at, data: strip(data) }));
        else sessionStorage.removeItem(backupKey);
      } catch {
        /* storage unavailable: the page still works */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [data, dirty, detail, backupKey]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Runs one server action; a refusal from the server is shown at the top of the page in its own words. */
  const run = async (name: string, action: () => Promise<void>): Promise<boolean> => {
    setBusy(name);
    setTrouble(null);
    try {
      await action();
      return true;
    } catch (e: any) {
      setTrouble({ message: e.message, errors: e.errors ?? [], status: e.status });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    run("save", async () => {
      const sent = strip(data);
      const saved = await siteContentApi.saveDraft(blockKey, sent, detail!.draft_at);
      setDetail(saved);
      setBase(JSON.stringify(sent));
      setRecovered(false);
      toast.success("Draft saved. Visitors do not see it yet.");
    });

  const preview = async () => {
    // Opened right away (while the click still counts), then pointed at the page once the draft is saved.
    const tab = window.open("about:blank", "_blank");
    if (dirty && !(await save())) {
      tab?.close();
      return;
    }
    const address = `${PAGE_FOR[blockKey]}?preview=1`;
    if (tab) tab.location.href = address;
    else window.open(address, "_blank");
  };

  const publish = async () => {
    await run("publish", async () => {
      if (dirty) {
        const sent = strip(data);
        const saved = await siteContentApi.saveDraft(blockKey, sent, detail!.draft_at);
        setBase(JSON.stringify(sent));
        setDetail(saved);
      }
      const live = await siteContentApi.publish(blockKey);
      setDetail(live);
      setRecovered(false);
      toast.success("Published. Visitors see it within about a minute.");
    });
    setAsking(null);
  };

  const discard = async () => {
    await run("discard", async () => {
      show(await siteContentApi.discard(blockKey));
      toast.success("Unpublished changes thrown away.");
    });
    setAsking(null);
  };

  const reset = async () => {
    await run("reset", async () => {
      show(await siteContentApi.reset(blockKey));
      toast.success("Back to the built-in text.");
    });
    setAsking(null);
  };

  const openHistory = () => run("history", async () => setVersions(await siteContentApi.history(blockKey)));

  const restore = async (version: number) => {
    setVersions(null);
    await run("restore", async () => {
      show(await siteContentApi.restore(blockKey, version));
      toast.success(`Version ${version} is back as a draft. Publish it when you are ready.`);
    });
  };

  const form = useMemo(() => {
    if (data === null) return null;
    const common = { contact };
    switch (blockKey) {
      case "contact":
        return <ContactForm value={data as ContactValue} onChange={setData} {...common} />;
      case "banner":
        return <BannerForm value={data} onChange={setData} {...common} />;
      case "testimonials":
        return <TestimonialsForm value={data as TestimonialsValue} onChange={setData} {...common} />;
      case "faq":
        return <FaqForm value={data as FaqValue} onChange={setData} {...common} />;
      case "home_hero":
        return <HeroForm value={data} onChange={setData} {...common} />;
      case "home_products":
        return <ProductsForm value={data as ProductsValue} onChange={setData} {...common} />;
      case "home_how":
        return <HowForm value={data} onChange={setData} {...common} />;
      case "home_headings":
        return <HeadingsForm value={data} onChange={setData} {...common} />;
      case "privacy":
        return <PolicyForm value={data as PolicyValue} onChange={setData} {...common} />;
    }
  }, [blockKey, data, contact]);

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[1100px] space-y-3 p-4 sm:p-6">
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800 ring-1 ring-red-200">
          {loadError}
        </p>
        <Link to="/admin/site-content" className="text-[13px] font-medium text-brand-blue hover:underline">
          Back to Site content
        </Link>
      </div>
    );
  }
  if (!detail || !form) return <p className="p-6 text-[13px] text-slate-500">Loading...</p>;

  const hasUnpublished = dirty || detail.status === "draft";
  const isPublished = detail.published_at !== null;
  const working = busy !== null;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4 p-4 sm:p-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-slate-500">
        <Link to="/admin/site-content" className="font-medium text-brand-blue hover:underline">
          Site content
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span aria-current="page">{detail.title}</span>
      </nav>

      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-bold text-slate-900">{detail.title}</h1>
          <StatusBadge status={dirty ? "draft" : detail.status} />
        </div>
        <p className="mt-0.5 text-[13px] text-slate-500">{detail.about}</p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {detail.published_at ? `Published by ${detail.published_by} on ${when(detail.published_at)}.` : "Not published yet: the site shows the text that came with it."}
          {detail.draft_at && ` Draft saved by ${detail.draft_by} on ${when(detail.draft_at)}.`}
        </p>
      </div>

      {/* Actions stay in view while editing a long list (on a phone they would cover too much of the screen, so they scroll away) */}
      <div className="z-20 -mx-1 flex md:sticky md:top-0 flex-wrap items-center gap-2 rounded-lg bg-slate-50/95 px-1 py-2 backdrop-blur">
        <Btn variant="primary" onClick={save} disabled={!dirty} busy={busy === "save"}>
          {busy === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
        </Btn>
        <Btn onClick={preview} disabled={working}>
          <Eye className="h-4 w-4" /> Preview on the site
        </Btn>
        <Btn onClick={() => setAsking("publish")} disabled={!hasUnpublished || working}>
          <Rocket className="h-4 w-4" /> Publish
        </Btn>
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
        <Btn onClick={openHistory} busy={busy === "history"}>
          <History className="h-4 w-4" /> History
        </Btn>
        <Btn onClick={() => setAsking("discard")} disabled={!hasUnpublished || working}>
          <Undo2 className="h-4 w-4" /> Discard changes
        </Btn>
        <Btn variant="danger" onClick={() => setAsking("reset")} disabled={detail.status === "built-in" || working}>
          <RotateCcw className="h-4 w-4" /> Reset to built-in text
        </Btn>
        <span role="status" className="ml-auto text-[12px] text-slate-500">
          {dirty ? "You have changes that are not saved." : detail.status === "draft" ? "Draft saved. Not published." : isPublished ? "Nothing waiting to be published." : ""}
        </span>
      </div>

      {trouble && (
        <div role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[13px] leading-snug text-red-900 ring-1 ring-red-200">
          <p className="font-semibold">{trouble.message}</p>
          {trouble.errors.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {trouble.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {trouble.status === 409 && (
            <button type="button" onClick={() => siteContentApi.get(blockKey).then((d) => show(d), (e) => setTrouble({ message: e.message, errors: [] }))} className="mt-2 font-semibold underline">
              Load the latest version (my unsaved changes will be lost)
            </button>
          )}
        </div>
      )}

      {recovered && (
        <p role="status" className="rounded-lg bg-blue-50 px-3.5 py-2 text-[13px] text-slate-700 ring-1 ring-blue-100">
          Your unsaved edits from earlier in this browser tab were brought back.{" "}
          <button type="button" onClick={() => { show(detail); setRecovered(false); }} className="font-semibold text-brand-blue underline">
            Throw them away
          </button>
        </p>
      )}

      {form}

      {asking === "publish" && (
        <Confirm title={`Publish "${detail.title}"?`} label="Publish" busy={busy === "publish"} onConfirm={publish} onCancel={() => setAsking(null)}>
          <p>Visitors will see this on the public pages within about a minute.{dirty && " Your unsaved changes are saved first."}</p>
          <p>The previous published version stays in the history.</p>
        </Confirm>
      )}
      {asking === "discard" && (
        <Confirm title="Throw away your changes?" label="Discard changes" danger busy={busy === "discard"} onConfirm={discard} onCancel={() => setAsking(null)}>
          <p>The draft and anything you typed since are removed. {isPublished ? "The published text stays as it is." : "The site keeps showing the text that came with it."}</p>
        </Confirm>
      )}
      {asking === "reset" && (
        <Confirm title="Go back to the built-in text?" label="Reset" danger busy={busy === "reset"} onConfirm={reset} onCancel={() => setAsking(null)}>
          <p>The public pages show the text that came with the site again, and the published text and any draft for this section are removed.</p>
          <p>Published versions stay in the history, so an earlier one can be brought back as a draft.</p>
        </Confirm>
      )}
      {versions && (
        <ModalShell titleId="history-title" onClose={() => setVersions(null)}>
          <h2 id="history-title" className="text-[15px] font-bold text-slate-900">
            History of {detail.title}
          </h2>
          {versions.length === 0 ? (
            <p className="mt-2 text-[13px] text-slate-600">Nothing has been published yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-[13px]">
              {versions.map((v) => (
                <li key={v.version} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900">{v.action === "publish" ? `Version ${v.version} published` : "Went back to the built-in text"}</span>
                    <span className="block text-[12px] text-slate-500">
                      {v.by} · {when(v.at)}
                    </span>
                  </span>
                  {v.restorable && (
                    <Btn onClick={() => restore(v.version)}>
                      <Undo2 className="h-4 w-4" /> Restore as draft
                    </Btn>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] leading-snug text-slate-500">Restoring puts that version in the draft, replacing the current draft. It reaches visitors only when you publish it.</p>
          <div className="mt-4 flex justify-end">
            <Btn onClick={() => setVersions(null)}>Close</Btn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
