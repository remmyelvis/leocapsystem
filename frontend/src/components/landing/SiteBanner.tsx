import { useEffect, useRef, type Ref } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { isSafeUrl } from "@/lib/siteContent/format";
import type { BannerBlock } from "@/lib/siteContent/types";
import { useSiteContent } from "@/lib/siteContent/useSiteContent";

const TONES = {
  info: { bar: "bg-brand-blue text-white", Icon: Info },
  warning: { bar: "bg-amber-400 text-amber-950", Icon: TriangleAlert },
  success: { bar: "bg-emerald-700 text-white", Icon: CircleCheck },
};

/** An announcement shows only when an admin has switched it on and written something. */
export const bannerShowing = (b: BannerBlock) => b.enabled && b.text.trim() !== "";

/** The bar itself. The admin editor shows it too, as the preview of what is being typed. */
export function BannerBar({ banner, barRef }: { banner: BannerBlock; barRef?: Ref<HTMLDivElement> }) {
  const { bar: colours, Icon } = TONES[banner.tone] ?? TONES.info;
  const link = banner.link_label && isSafeUrl(banner.link_url) ? banner.link_url : null;
  const linkClass = "inline-flex min-h-[28px] items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline";
  const arrow = <ArrowRight className="h-3.5 w-3.5" aria-hidden />;

  return (
    <div ref={barRef} role="region" aria-label="Announcement" className={`${colours} px-4 py-2 text-[13.5px] leading-snug sm:px-6 lg:px-8`}>
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
          {banner.text}
        </span>
        {link &&
          (link.startsWith("/") ? (
            <Link to={link} className={linkClass}>
              {banner.link_label}
              {arrow}
            </Link>
          ) : (
            <a href={link} className={linkClass}>
              {banner.link_label}
              {arrow}
            </a>
          ))}
      </p>
    </div>
  );
}

/**
 * The announcement across the top of the public pages (Admin > Site content > Announcement banner).
 * It sits inside the fixed header, so the page below is moved down by its height to keep the first section clear of it.
 */
export default function SiteBanner() {
  const { banner } = useSiteContent();
  const bar = useRef<HTMLDivElement>(null);
  const show = bannerShowing(banner);

  useEffect(() => {
    const el = bar.current;
    if (!show || !el) return;
    const fit = () => {
      document.body.style.paddingTop = `${el.offsetHeight}px`;
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => {
      watch.disconnect();
      document.body.style.paddingTop = "";
    };
  }, [show]);

  return show ? <BannerBar banner={banner} barRef={bar} /> : null;
}
