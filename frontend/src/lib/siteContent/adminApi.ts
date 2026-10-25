import axiosInstance from "@/lib/axiosInstance";
import type { SiteBlocks } from "./types";

// The editor's calls to /api/site-content (admins only; the server refuses everyone else, and refuses all of it in the demo).

export type BlockKey = keyof SiteBlocks;
export type BlockStatus = "built-in" | "published" | "draft";

export interface BlockSummary {
  key: BlockKey;
  title: string;
  about: string;
  status: BlockStatus;
  version: number;
  draft_by: string | null;
  draft_at: string | null;
  published_by: string | null;
  published_at: string | null;
}

export interface BlockDetail<K extends BlockKey = BlockKey> extends BlockSummary {
  draft: SiteBlocks[K] | null;
  published: SiteBlocks[K] | null;
}

export interface Version {
  version: number;
  action: "publish" | "reset";
  by: string | null;
  at: string | null;
  restorable: boolean;
}

/** An answer from the server that says what is wrong in plain words (`errors` has one line per problem). */
export class ContentProblem extends Error {
  constructor(message: string, public errors: string[] = [], public status?: number) {
    super(message);
  }
}

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (e: any) {
    const body = e?.response?.data;
    throw new ContentProblem(body?.message || e?.message || "Something went wrong. Please try again.", Array.isArray(body?.errors) ? body.errors : [], e?.response?.status);
  }
}

const url = (key: BlockKey, rest = "") => `/api/site-content/${key}${rest}`;

export const siteContentApi = {
  list: () => call(axiosInstance.get<{ blocks: BlockSummary[] }>("/api/site-content/admin")).then((r) => r.blocks),
  get: (key: BlockKey) => call(axiosInstance.get<BlockDetail>(`/api/site-content/admin/${key}`)),
  /** `seen` is the draft time the editor loaded; the server refuses the save if someone else saved a draft since. */
  saveDraft: (key: BlockKey, data: unknown, seen: string | null) => call(axiosInstance.put<BlockDetail>(url(key, "/draft"), { data, expected_draft_at: seen })),
  publish: (key: BlockKey) => call(axiosInstance.post<BlockDetail>(url(key, "/publish"))),
  discard: (key: BlockKey) => call(axiosInstance.post<BlockDetail>(url(key, "/discard"))),
  reset: (key: BlockKey) => call(axiosInstance.post<BlockDetail>(url(key, "/reset"))),
  history: (key: BlockKey) => call(axiosInstance.get<{ versions: Version[] }>(url(key, "/history"))).then((r) => r.versions),
  restore: (key: BlockKey, version: number) => call(axiosInstance.post<BlockDetail>(url(key, `/restore/${version}`))),
};

/** The public page where a block can be seen, for "Preview on the site" and "View on the site". */
export const PAGE_FOR: Record<BlockKey, string> = { contact: "/", banner: "/", testimonials: "/", faq: "/faq" };
