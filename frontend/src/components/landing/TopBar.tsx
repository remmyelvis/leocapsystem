import { Link } from "react-router-dom";
import { ArrowRight, FileText, Mail, MapPin, Phone } from "lucide-react";
import { useContact, useSiteContent } from "@/lib/siteContent/useSiteContent";
import { bannerShowing } from "./SiteBanner";
import { APPLICATIONS_TO, SIGN_IN_TO } from "./site";

// The slim navy strip above the landing page's navbar, there while the page is at the very top (SiteHeader says when; it slides away
// with the first scroll). Left: ways to reach a person (all from the editable contact details; on phones see below). Right: for people who have already applied.
// It makes no claims (no hours, rates or licences), because the site has none to quote.
// On a phone the navbar already has a one-tap call button, so the strip does not repeat the number there: it offers the checklist of
// documents to have ready instead (the most common reason people stall, and on a phone they can photograph them right away).

// The strip is as tall as a one-line announcement banner (SiteBanner.tsx: same text size, line height and padding, so the two always match:
// 28 px on a phone, 31 px from 640 px). The padding sits on the links, so each link is the strip's full height as its tap area.
const LINK =
  "inline-flex items-center gap-2 whitespace-nowrap rounded py-[6px] leading-[1.3] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:py-[7px]";
const ICON = "h-3.5 w-3.5 flex-shrink-0 text-red-300";

/** `portal` is where the signed-in person's own pages start (null when signed out); "/dashboard" means an applicant. */
export default function TopBar({ show, portal }: { show: boolean; portal: string | null }) {
  const contact = useContact();
  const applicant = portal === "/dashboard";
  // On a phone the announcement banner has the top to itself (the owner decided this); wider screens keep both.
  const announcing = bannerShowing(useSiteContent().banner);

  // Collapses the way the phone menu does; invisible when closed, so nothing in it can be tabbed to.
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${show ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${announcing ? "max-md:hidden" : ""}`}>
      <div className={`overflow-hidden transition-[visibility] duration-300 motion-reduce:transition-none ${show ? "visible" : "invisible"}`}>
        <div className="bg-[#081430] text-[12.5px] text-white/85 sm:text-[13px]">
          <div className="mx-auto flex max-w-7xl items-stretch justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-stretch gap-x-5">
              <Link to="/faq#documents" className={`${LINK} font-semibold text-white md:hidden`}>
                <FileText className={ICON} aria-hidden />
                Documents needed
              </Link>
              {contact.phones.map((p, i) => (
                <a key={p.href} href={p.href} aria-label={`Call us on ${p.label}`} className={`${LINK} font-semibold text-white ${i ? "hidden lg:inline-flex" : "hidden md:inline-flex"}`}>
                  <Phone className={ICON} aria-hidden />
                  {p.label}
                </a>
              ))}
              <a href={`mailto:${contact.email}`} className={`${LINK} hidden min-w-0 md:inline-flex`}>
                <Mail className={ICON} aria-hidden />
                <span className="max-w-[220px] truncate">{contact.email}</span>
              </a>
              <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`${contact.address}, opens in Maps`} className={`${LINK} hidden min-w-0 xl:inline-flex`}>
                <MapPin className={ICON} aria-hidden />
                <span className="max-w-[300px] truncate">{contact.address}</span>
              </a>
            </div>

            {/* Signed out: sign in and land on the applications list. Applicant: straight to it. Staff have their own portals: nothing here. */}
            {(!portal || applicant) && (
              <Link to={applicant ? APPLICATIONS_TO : SIGN_IN_TO} state={applicant ? undefined : { next: APPLICATIONS_TO }} className={`${LINK} shrink-0 font-semibold text-white`}>
                {applicant ? (
                  "My applications"
                ) : (
                  <>
                    <span className="hidden font-normal text-white/75 sm:inline">Already applied?</span>
                    <span className="sm:hidden">Track application</span>
                    <span className="hidden sm:inline">Track your application</span>
                  </>
                )}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
