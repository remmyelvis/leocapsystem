import type { ReactNode } from "react";
import { Reveal } from "./motion";

export default function SectionHeader({
  eyebrow,
  title,
  children,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <Reveal className="mb-14 text-center sm:mb-16">
      <span className={`inline-flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-widest ${dark ? "text-red-300" : "text-red-700"}`}>
        <span className="h-px w-6 bg-current opacity-60" aria-hidden />
        {eyebrow}
        <span className="h-px w-6 bg-current opacity-60" aria-hidden />
      </span>
      <h2 className={`mt-3 font-display text-3xl font-bold tracking-[-0.015em] sm:text-4xl ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
      <p className={`mx-auto mt-4 max-w-xl text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-slate-600"}`}>{children}</p>
    </Reveal>
  );
}
