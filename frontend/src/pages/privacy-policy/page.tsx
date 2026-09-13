import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

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
          <h1 className="text-3xl font-black text-slate-900 mb-6">PRIVACY POLICY</h1>
          <div className="prose prose-blue max-w-none text-slate-600 text-sm leading-relaxed space-y-6">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">1. Introduction</h2>
              <p className="mb-2">Leocap Invest ("Leocap", "we", "our", or "us") is committed to protecting the privacy and confidentiality of personal information entrusted to us by applicants, borrowers, guarantors, referees, and other individuals whose information we process in the course of providing financial services.</p>
              <p className="mb-2">This Privacy Policy explains how we collect, use, store, share, and protect personal data in accordance with the provisions of the Kenya Data Protection Act, 2019 and all applicable regulations.</p>
              <p>By accessing our website, mobile platform, or loan application system and submitting personal information, you acknowledge that you have read and understood this Privacy Policy and consent to the processing of your personal data as described herein.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">2. Data Controller</h2>
              <p className="mb-2">Leocap Invest is the Data Controller for purposes of personal data processed under this Privacy Policy.</p>
              <p className="mb-2">For any privacy-related inquiries, requests, or complaints, you may contact:</p>
              <address className="not-italic text-gray-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p><strong>Data Protection Officer</strong><br />Leocap Invest</p>
                <p className="mt-2"><strong>Email:</strong> privacy@leocap.com</p>
                <p><strong>Telephone:</strong> +254 700 000000</p>
                <p><strong>Postal Address:</strong> P.O. Box 184-00100, Nairobi, Kenya</p>
              </address>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">3. Information We Collect</h2>
              <p className="mb-4">We may collect and process the following categories of personal information:</p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-800">A. Personal Identification Information</h3>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Full names</li>
                    <li>National ID or Passport Number</li>
                    <li>KRA PIN</li>
                    <li>Date of Birth</li>
                    <li>Gender</li>
                    <li>Passport photograph or profile image</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800">B. Contact Information</h3>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Mobile telephone number</li>
                    <li>Email address</li>
                    <li>Residential address</li>
                    <li>Postal address</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800">C. Employment Information</h3>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Employer details</li>
                    <li>Employment number</li>
                    <li>Job designation</li>
                    <li>Salary information</li>
                    <li>Bank account information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800">D. Financial Information</h3>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Loan application information</li>
                    <li>Loan repayment history</li>
                    <li>Banking information</li>
                    <li>Mobile money transaction details</li>
                    <li>Creditworthiness information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800">E. Technical Information</h3>
                  <p className="mt-1 mb-2">When using our website or online portal, we may collect:</p>
                  <ul className="list-disc pl-5">
                    <li>IP address</li>
                    <li>Browser information</li>
                    <li>Device information</li>
                    <li>Login records</li>
                    <li>Date and time of access</li>
                    <li>System-generated audit logs</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800">F. Supporting Documents</h3>
                  <ul className="list-disc pl-5 mt-1">
                    <li>National ID copies</li>
                    <li>Payslips</li>
                    <li>Bank statements</li>
                    <li>Employment letters</li>
                    <li>Any documents submitted during loan processing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">4. Purpose of Processing</h2>
              <p className="mb-4">We process personal data for legitimate business and legal purposes, including:</p>
              
              <div className="space-y-3">
                <div>
                  <strong className="text-slate-800">Loan Assessment</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Identity verification</li>
                    <li>Fraud prevention</li>
                    <li>Credit risk assessment</li>
                    <li>Eligibility determination</li>
                  </ul>
                </div>
                
                <div>
                  <strong className="text-slate-800">Loan Administration</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Loan processing</li>
                    <li>Loan disbursement</li>
                    <li>Repayment management</li>
                    <li>Customer communication</li>
                  </ul>
                </div>
                
                <div>
                  <strong className="text-slate-800">Debt Recovery</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Collection of overdue amounts</li>
                    <li>Recovery proceedings</li>
                    <li>Enforcement of contractual obligations</li>
                  </ul>
                </div>
                
                <div>
                  <strong className="text-slate-800">Legal and Regulatory Compliance</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Compliance with applicable laws</li>
                    <li>Tax compliance</li>
                    <li>Anti-money laundering requirements</li>
                    <li>Regulatory reporting</li>
                  </ul>
                </div>
                
                <div>
                  <strong className="text-slate-800">Business Operations</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Internal reporting</li>
                    <li>Service improvement</li>
                    <li>System security</li>
                    <li>Risk management</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">5. Legal Basis for Processing</h2>
              <p className="mb-2">We process personal data based on one or more of the following lawful grounds:</p>
              <ul className="list-decimal pl-5">
                <li>Consent of the data subject;</li>
                <li>Performance of a contract;</li>
                <li>Compliance with legal obligations;</li>
                <li>Protection of legitimate interests pursued by Leocap Invest;</li>
                <li>Establishment, exercise, or defence of legal claims.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">6. Disclosure of Personal Information</h2>
              <p className="mb-4">We may share personal information where reasonably necessary with:</p>
              
              <div className="space-y-3 mb-4">
                <div>
                  <strong className="text-slate-800">Service Providers:</strong> Technology providers, Cloud hosting providers, Payment processors
                </div>
                <div>
                  <strong className="text-slate-800">Professional Advisors:</strong> Advocates, Auditors, Accountants, Compliance consultants
                </div>
                <div>
                  <strong className="text-slate-800">Debt Recovery Partners:</strong> Licensed debt collection agencies, Auctioneers, Recovery agents
                </div>
                <div>
                  <strong className="text-slate-800">Regulatory Authorities:</strong> Courts of law, Law enforcement agencies, Government agencies, Regulatory bodies
                </div>
                <div>
                  <strong className="text-slate-800">Credit Information Providers:</strong> Credit Reference Bureaus (where applicable and lawful)
                </div>
              </div>
              <p className="font-medium text-slate-800">We do not sell personal data to third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">7. Data Security</h2>
              <p className="mb-2">We implement appropriate technical and organizational measures to protect personal information against:</p>
              <ul className="list-disc pl-5 mb-4 mt-1">
                <li>Unauthorized access</li>
                <li>Accidental loss</li>
                <li>Alteration</li>
                <li>Disclosure</li>
                <li>Destruction</li>
              </ul>

              <p className="mb-2">Security measures include:</p>
              <ul className="list-disc pl-5 mb-4 mt-1">
                <li>Password-protected systems</li>
                <li>Access controls</li>
                <li>Encryption where appropriate</li>
                <li>Audit trails</li>
                <li>Secure backups</li>
              </ul>
              <p>While we strive to protect information, no system can guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">8. Data Retention</h2>
              <p className="mb-2">We retain personal information only for as long as necessary to:</p>
              <ul className="list-disc pl-5 mb-4 mt-1">
                <li>Fulfil contractual obligations;</li>
                <li>Meet legal and regulatory requirements;</li>
                <li>Resolve disputes;</li>
                <li>Enforce agreements.</li>
              </ul>
              <p>Where information is no longer required, it will be securely deleted, anonymized, or archived in accordance with applicable law.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">9. Rights of Data Subjects</h2>
              <p className="mb-2">Under the Kenya Data Protection Act, 2019, individuals may have the right to:</p>
              <ul className="list-disc pl-5 mb-4 mt-1">
                <li>Access personal data held by us;</li>
                <li>Request correction of inaccurate information;</li>
                <li>Request deletion of personal information where legally permissible;</li>
                <li>Object to certain processing activities;</li>
                <li>Withdraw consent where processing is based on consent;</li>
                <li>Lodge a complaint with the Office of the Data Protection Commissioner.</li>
              </ul>
              <p>Requests may be submitted through the contact details provided in this Privacy Policy.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">10. Cross-Border Data Transfers</h2>
              <p>Where personal information is stored or processed outside Kenya, Leocap Invest shall ensure that appropriate safeguards are in place and that such transfers comply with applicable data protection laws.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">11. Debt Recovery Communications</h2>
              <p className="mb-2">In the event of loan default, the Borrower acknowledges and consents that Leocap Invest may contact:</p>
              <ul className="list-disc pl-5 mb-4 mt-1">
                <li>The Borrower directly;</li>
                <li>Referees provided by the Borrower;</li>
                <li>Employers (where applicable);</li>
                <li>Advocates;</li>
                <li>Debt collection agencies;</li>
              </ul>
              <p className="mb-2">strictly for purposes of tracing, recovery, enforcement, and administration of outstanding loan obligations.</p>
              <p>Such communications shall be conducted in accordance with applicable law and the Data Protection Act, 2019.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">12. Changes to this Policy</h2>
              <p>Leocap Invest reserves the right to amend this Privacy Policy from time to time. Any updated version shall be published on the relevant platform and shall take effect upon publication.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">13. Consent</h2>
              <p className="mb-2">By ticking the acceptance box and submitting a loan application through the Leocap Invest platform, the Applicant:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Confirms that all information provided is accurate and complete;</li>
                <li>Consents to the collection, processing, storage, and sharing of personal data as described in this Privacy Policy;</li>
                <li>Authorizes Leocap Invest to verify information provided during the loan application process;</li>
                <li>Acknowledges that electronic acceptance constitutes valid consent under the Kenya Data Protection Act, 2019 and the Kenya Information and Communications Act.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
