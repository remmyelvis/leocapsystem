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
  // The message and its link run on as one sentence (the link used to wrap onto a row of its own on phones, making a 3-line bar). The bar is
  // one line on a laptop (about 31 px) and two on a phone (about 44 px); touch screens get a larger invisible tap area (tap-link, globals.css).
  const linkClass = "tap-link ml-1 inline-flex items-center gap-1 whitespace-nowrap font-semibold underline underline-offset-2 hover:no-underline";
  const arrow = <ArrowRight className="h-3.5 w-3.5" aria-hidden />;

  return (
    <div ref={barRef} role="region" aria-label="Announcement" className={`${colours} px-4 py-[6px] text-[12.5px] leading-[1.3] sm:px-6 sm:py-[7px] sm:text-[13px] lg:px-8`}>
      <p className="mx-auto max-w-7xl text-center">
        <Icon className="mr-1.5 inline-block h-3.5 w-3.5 align-[-2px]" aria-hidden />
        {banner.text}{" "}
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
