import { Link } from "react-router-dom";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { useContact, useSiteContent } from "@/lib/siteContent/useSiteContent";
import { bannerShowing } from "./SiteBanner";
import { APPLICATIONS_TO, SIGN_IN_TO } from "./site";

// The slim navy strip above the landing page's navbar, there while the page is at the very top (SiteHeader says when; it slides away
// with the first scroll). Left: ways to reach a person, all from the editable contact details. Right: for people who have already applied.
// It makes no claims (no hours, rates or licences), because the site has none to quote.

const LINK =
  "inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:min-h-[36px]";
const ICON = "h-3.5 w-3.5 flex-shrink-0 text-red-300";

/** `portal` is where the signed-in person's own pages start (null when signed out); "/dashboard" means an applicant. */
export default function TopBar({ show, portal }: { show: boolean; portal: string | null }) {
  const contact = useContact();
  const applicant = portal === "/dashboard";
  // On a phone the announcement banner has the top to itself (strip + banner + navbar would be a quarter of the screen); wider screens keep both.
  const announcing = bannerShowing(useSiteContent().banner);

  // Collapses the way the phone menu does; invisible when closed, so nothing in it can be tabbed to.
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${show ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${announcing ? "max-md:hidden" : ""}`}>
      <div className={`overflow-hidden transition-[visibility] duration-300 motion-reduce:transition-none ${show ? "visible" : "invisible"}`}>
        <div className="bg-[#081430] text-[12px] text-white/85 md:text-[13px]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-x-5">
              {contact.phones.map((p, i) => (
                <a key={p.href} href={p.href} aria-label={`Call us on ${p.label}`} className={`${LINK} font-semibold text-white ${i ? "hidden lg:inline-flex" : ""}`}>
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
