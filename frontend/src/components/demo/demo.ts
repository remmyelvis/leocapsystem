import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "@/lib/axiosInstance";
import { getToken } from "@/lib/apiClient";

/** True only in the demo build (VITE_DEMO=true when it is built). The live site never shows or loads any demo tool. */
export const IS_DEMO = __DEMO__;

export type PersonaRole = "admin" | "hr" | "finance" | "borrower";

export interface Persona {
  key: string;
  name: string;
  title: string;
  email: string;
  company: string | null;
  role: PersonaRole;
  portal: "admin" | "applicant"; // which sign-in page the account belongs to
  blurb: string;
}

export interface PersonaList {
  password: string; // the one password every demo account shares (it is sample data, not a secret)
  personas: Persona[];
}

export const fetchPersonas = () => axiosInstance.get<PersonaList>("/api/demo/personas").then((r) => r.data);

export interface DemoEmail {
  id: string;
  to: string | null;
  subject: string | null;
  body: string;
  purpose: string;
  sent_at: string | null;
}

export interface JobResult {
  emails_sent: number;
  delinquent_marked: number;
  emails: { to: string | null; subject: string | null }[];
}

export const fetchInbox = () => axiosInstance.get<{ emails: DemoEmail[] }>("/api/demo/inbox").then((r) => r.data.emails);
export const runDailyJob = () => axiosInstance.post<JobResult>("/api/demo/run-daily-job").then((r) => r.data);
export const startReset = () => axiosInstance.post("/api/demo/reset").then((r) => r.data);
export const fetchResetStatus = () => axiosInstance.get<{ reset: "idle" | "running" | "done" | "failed"; seconds_ago: number | null }>("/api/demo/status").then((r) => r.data);

/** What the server said went wrong, in its own words. */
export const problem = (e: any, fallback: string): string => e?.response?.data?.message || fallback;

/** A link that signs in as this person and lands them in their own portal, or on `next` (a page of this site) when it is given. */
export const signInLink = (p: Pick<Persona, "portal" | "email">, next?: string) =>
  `/login/${p.portal}?as=${encodeURIComponent(p.email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

export interface GuideStory {
  key: string;
  title: string;
  pitch: string;
  who: Pick<Persona, "key" | "name" | "title" | "email" | "portal">;
  steps: string[];
  links: { label: string; path: string; who: GuideStory["who"] }[];
}

export const fetchGuide = () => axiosInstance.get<{ stories: GuideStory[] }>("/api/demo/guide").then((r) => r.data.stories);

/** On a sign-in page in the demo: `?as=<email>` signs in as that person with the page's own sign-in code, so there is only one copy of it.
 *  With `&next=/some/page` they then land there (a page of this site only) instead of on their portal's home. */
export function useDemoSignIn(signIn: (data: { email: string; password: string }) => Promise<void>) {
  const params = new URLSearchParams(useLocation().search);
  const email = params.get("as");
  const next = params.get("next");
  const navigate = useNavigate();
  const started = useRef(false);
  useEffect(() => {
    if (!IS_DEMO || !email || started.current) return;
    started.current = true;
    fetchPersonas()
      .then((list) => signIn({ email, password: list.password }))
      .then(() => {
        if (next && /^\/(?!\/)/.test(next) && getToken()) navigate(next, { replace: true }); // a signed-in person, and a path on this site
      })
      .catch(() => {});
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps
}
