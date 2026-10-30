import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import { RichText } from "@/lib/siteContent/format";
import { useContact, useSiteContent } from "@/lib/siteContent/useSiteContent";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { privacy } = useSiteContent();
  const contact = useContact();

  const handleGoBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleGoBack} 
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Go Back
          </button>
          <BrandLogo size="sm" />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-10">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-6">PRIVACY POLICY</h1>
          <div className="prose prose-blue max-w-none text-slate-600 text-sm leading-relaxed space-y-6">
            {/* The sections are editable content (Admin > Site content > Privacy policy); the number comes from the position. */}
            {privacy.items.map((section, i) => (
              <section key={i}>
                <h2 className="font-display text-lg font-bold text-slate-900 mb-2">
                  {i + 1}. {section.title}
                </h2>
                <div className="space-y-2">
                  <RichText variant="policy" source={section.body} contact={contact} />
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
