import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { IS_DEMO } from './components/demo/demo';
import DemoToolbox from './components/demo/DemoToolbox';
import PreviewBar from './components/landing/PreviewBar';
import PageLoadBoundary from './components/global/PageLoadBoundary';
import AssistantWidget from './components/assistant/AssistantWidget';
import RouteSeo from './lib/seo/RouteSeo';
import Page47 from './pages/page';

// Every page except the home page is its own file, fetched when it is first opened: a visitor to the public pages does not
// download the admin, HR, finance and borrower screens. See the note on `vite:preloadError` in main.tsx.
const SiteContentPage = lazy(() => import('./pages/admin/site-content/page'));
const SiteContentEditorPage = lazy(() => import('./pages/admin/site-content/[key]/page'));
const DemoPage = lazy(() => import('./pages/demo/page'));
const DemoInboxPage = lazy(() => import('./pages/demo/inbox/page'));
const DemoGuidePage = lazy(() => import('./pages/demo/guide/page'));
const AdminLayout = lazy(() => import('./pages/admin/layout'));
const DashboardLayout = lazy(() => import('./pages/dashboard/layout'));
const FinanceLayout = lazy(() => import('./pages/finance/layout'));
const HRLayout = lazy(() => import('./pages/hr/layout'));
const Page0 = lazy(() => import('./pages/admin/applications/page'));
const Page1 = lazy(() => import('./pages/admin/applications/[id]/page'));
const Page2 = lazy(() => import('./pages/admin/audit-trail/page'));
const Page3 = lazy(() => import('./pages/admin/audit-trail/[id]/page'));
const AuditLogDetailPage = lazy(() => import('./pages/admin/audit-trail/logs/[logId]/page'));
const Page4 = lazy(() => import('./pages/admin/dashboard/page'));
const Page5 = lazy(() => import('./pages/admin/manage-admins/page'));
const Page6 = lazy(() => import('./pages/admin/manage-applicants/page'));
const FinancialAnalysisPage = lazy(() => import('./pages/admin/manage-applicants/[id]/financial-analysis'));
const Page7 = lazy(() => import('./pages/admin/manage-applicants/[id]/page'));
const Page8 = lazy(() => import('./pages/admin/manage-staff/page'));
const Page9 = lazy(() => import('./pages/admin/profile/page'));
const Page10 = lazy(() => import('./pages/admin/reports/page'));
const Page11 = lazy(() => import('./pages/admin/settings/page'));
const Page50 = lazy(() => import('./pages/admin/calculators/page'));
const BorrowerCalculator = lazy(() => import('./pages/dashboard/calculators/page'));
const CustomReportBuilder = lazy(() => import('./pages/admin/reports/builder/page'));
const CompaniesPage = lazy(() => import('./pages/admin/manage-companies/page'));
const Page12 = lazy(() => import('./pages/dashboard/applications/page'));
const Page13 = lazy(() => import('./pages/dashboard/applications/[id]/page'));
const Page14 = lazy(() => import('./pages/dashboard/apply/general-loan/page'));
const Page15 = lazy(() => import('./pages/dashboard/apply/page'));
const Page16 = lazy(() => import('./pages/dashboard/apply/salary-advance/page'));
const Page17 = lazy(() => import('./pages/dashboard/page'));
const Page18 = lazy(() => import('./pages/dashboard/profile/page'));
const Page19 = lazy(() => import('./pages/finance/applications/page'));
const Page20 = lazy(() => import('./pages/finance/applications/pending/[id]/page'));
const Page21 = lazy(() => import('./pages/finance/applications/[id]/page'));
const Page22 = lazy(() => import('./pages/finance/apply/page'));
const Page23 = lazy(() => import('./pages/finance/dashboard/page'));
const Page24 = lazy(() => import('./pages/finance/hr-loans/page'));
const Page27 = lazy(() => import('./pages/finance/my-loans/page'));
const Page28 = lazy(() => import('./pages/finance/page'));
const Page29 = lazy(() => import('./pages/finance/profile/page'));
const Page30 = lazy(() => import('./pages/forgot-password/page'));
const ResetPasswordPage = lazy(() => import('./pages/reset-password/page'));
const Page31 = lazy(() => import('./pages/hr/applications/page'));
const Page32 = lazy(() => import('./pages/hr/applications/pending/[id]/page'));
const Page33 = lazy(() => import('./pages/hr/applications/[id]/page'));
const Page34 = lazy(() => import('./pages/hr/apply/page'));
const Page35 = lazy(() => import('./pages/hr/dashboard/page'));
const Page38 = lazy(() => import('./pages/hr/my-loans/page'));
const Page40 = lazy(() => import('./pages/hr/page'));
const Page41 = lazy(() => import('./pages/hr/profile/page'));
const Page42 = lazy(() => import('./pages/login/admin/page'));
const loadSignIn = () => import('./pages/login/applicant/page');
const Page43 = lazy(loadSignIn);
const Page46 = lazy(() => import('./pages/login/page'));
const loadPrivacy = () => import('./pages/privacy-policy/page');
const Page48 = lazy(loadPrivacy);
const TermsPage = lazy(() => import('./pages/terms-and-conditions/page'));
const loadFaq = () => import('./pages/faq/page');
const FaqPage = lazy(loadFaq);
const loadRegister = () => import('./pages/register/page');
const Page49 = lazy(loadRegister);
const NotFoundPage = lazy(() => import('./pages/not-found'));

// Finance reviews an HR loan on the full review page. This old address is kept because emails already sent link to it.
function ReviewHrLoan() {
  const { id } = useParams();
  return <Navigate to={`/finance/applications/pending/${id}`} replace />;
}

// While someone reads the home page, fetch the pages they are most likely to open next (they then open at once).
function usePrefetchPublicPages(pathname: string) {
  useEffect(() => {
    if (pathname !== '/') return;
    const run = () => [loadSignIn, loadRegister, loadFaq, loadPrivacy].forEach((load) => load().catch(() => {}));
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 2500);
    return () => window.clearTimeout(id);
  }, [pathname]);
}

function App() {
  const { pathname } = useLocation();
  usePrefetchPublicPages(pathname);
  return (
    <>
    <RouteSeo />
    <AssistantWidget />
    <PageLoadBoundary resetKey={pathname}>
    <Suspense fallback={<div role="status" className="grid min-h-screen place-items-center text-sm text-slate-500">Loading...</div>}>
    <Routes>
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="applications" element={<Page0 />} />
        <Route path="applications/:id" element={<Page1 />} />
        <Route path="audit-trail/logs/:logId" element={<AuditLogDetailPage />} />
        <Route path="audit-trail/:id" element={<Page3 />} />
        <Route path="dashboard" element={<Page4 />} />
        <Route path="manage-admins" element={<Page5 />} />
        <Route path="manage-applicants" element={<Page6 />} />
        <Route path="manage-companies" element={<CompaniesPage />} />
        <Route path="manage-applicants/:id" element={<Page7 />} />
        <Route path="manage-applicants/:id/financial-analysis" element={<FinancialAnalysisPage />} />
        <Route path="manage-staff" element={<Page8 />} />
        <Route path="profile" element={<Page9 />} />
        <Route path="reports" element={<Page10 />} />
        <Route path="reports/builder" element={<CustomReportBuilder />} />
        <Route path="settings" element={<Page11 />} />
        <Route path="audit-trail" element={<Page2 />} />
        <Route path="calculators" element={<Page50 />} />
        {/* The site content editor is not part of the demo build (IS_DEMO is a build-time constant). */}
        {!IS_DEMO && <Route path="site-content" element={<SiteContentPage />} />}
        {!IS_DEMO && <Route path="site-content/:key" element={<SiteContentEditorPage />} />}
      </Route>

      {/* Dashboard Routes */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route path="applications" element={<Page12 />} />
        <Route path="applications/:id" element={<Page13 />} />
        <Route path="apply/general-loan" element={<Page14 />} />
        <Route path="apply" element={<Page15 />} />
        <Route path="apply/salary-advance" element={<Page16 />} />
        <Route path="" element={<Page17 />} />
        <Route path="profile" element={<Page18 />} />
        <Route path="calculators" element={<BorrowerCalculator />} />
      </Route>

      {/* Finance Routes */}
      <Route path="/finance" element={<FinanceLayout />}>
        <Route path="applications" element={<Page19 />} />
        <Route path="applications/pending/:id" element={<Page20 />} />
        <Route path="applications/:id" element={<Page21 />} />
        <Route path="apply" element={<Page22 />} />
        <Route path="dashboard" element={<Page23 />} />
        <Route path="hr-loans" element={<Page24 />} />
        <Route path="hr-loans/pending/:id" element={<ReviewHrLoan />} />
        <Route path="my-loans" element={<Page27 />} />
        <Route path="" element={<Page28 />} />
        <Route path="profile" element={<Page29 />} />
      </Route>

      {/* HR Routes */}
      <Route path="/hr" element={<HRLayout />}>
        <Route path="applications" element={<Page31 />} />
        <Route path="applications/pending/:id" element={<Page32 />} />
        <Route path="applications/:id" element={<Page33 />} />
        <Route path="apply" element={<Page34 />} />
        <Route path="dashboard" element={<Page35 />} />
        <Route path="my-loans" element={<Page38 />} />
        <Route path="" element={<Page40 />} />
        <Route path="profile" element={<Page41 />} />
      </Route>

      {/* Public Routes */}
      <Route path="/forgot-password" element={<Page30 />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login/admin" element={<Page42 />} />
      <Route path="/login/applicant" element={<Page43 />} />
      <Route path="/login" element={<Page46 />} />
      <Route path="/" element={<Page47 />} />
      <Route path="/privacy-policy" element={<Page48 />} />
      <Route path="/terms-and-conditions" element={<TermsPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/register" element={<Page49 />} />
      {/* Demo only: the role picker and the presenter's tools. IS_DEMO is a build-time constant, so the live build contains none of it. */}
      {IS_DEMO && <Route path="/demo" element={<DemoPage />} />}
      {IS_DEMO && <Route path="/demo/inbox" element={<DemoInboxPage />} />}
      {IS_DEMO && <Route path="/demo/guide" element={<DemoGuidePage />} />}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
    </PageLoadBoundary>
    {IS_DEMO && <DemoToolbox />}
    {!IS_DEMO && <PreviewBar />}
    </>
  );
}

export default App;
