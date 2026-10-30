import LegalPage from "@/components/global/LegalPage";
import { REGISTRATION } from "@/components/landing/site";
import { useSiteContent } from "@/lib/siteContent/useSiteContent";

export default function PrivacyPolicyPage() {
  const { privacy } = useSiteContent();
  return (
    <LegalPage
      title="PRIVACY POLICY"
      sections={privacy.items}
      facts={[
        ["Data controller", REGISTRATION.legalName],
        ["Data Protection Commissioner ID", REGISTRATION.dataControllerId],
        ["Registered business name", REGISTRATION.businessNumber],
        ["Postal address", REGISTRATION.postalAddress],
      ]}
    />
  );
}
