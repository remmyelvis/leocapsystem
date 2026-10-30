import LegalPage from "@/components/global/LegalPage";
import { REGISTRATION } from "@/components/landing/site";
import { useContact, useSiteContent } from "@/lib/siteContent/useSiteContent";

export default function TermsAndConditionsPage() {
  const { terms } = useSiteContent();
  const { email } = useContact();
  return (
    <LegalPage
      title="TERMS AND CONDITIONS"
      sections={terms.items}
      facts={[
        ["Operated by", REGISTRATION.legalName],
        ["Registered business name", REGISTRATION.businessNumber],
        ["Postal address", REGISTRATION.postalAddress],
        ["Email", <a key="email" href={`mailto:${email}`} className="text-brand-blue underline-offset-2 hover:underline">{email}</a>],
      ]}
    />
  );
}
