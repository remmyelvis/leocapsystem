import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './pages/admin/layout';
import DashboardLayout from './pages/dashboard/layout';
import FinanceLayout from './pages/finance/layout';
import HRLayout from './pages/hr/layout';

import Page0 from './pages/admin/applications/page';
import Page1 from './pages/admin/applications/[id]/page';
import Page2 from './pages/admin/audit-trail/page';
import Page3 from './pages/admin/audit-trail/[id]/page';
import Page4 from './pages/admin/dashboard/page';
import Page5 from './pages/admin/manage-admins/page';
import Page6 from './pages/admin/manage-applicants/page';
import FinancialAnalysisPage from './pages/admin/manage-applicants/[id]/financial-analysis';
import Page7 from './pages/admin/manage-applicants/[id]/page';
import Page8 from './pages/admin/manage-staff/page';
import Page9 from './pages/admin/profile/page';
import Page10 from './pages/admin/reports/page';
import Page11 from './pages/admin/settings/page';
import Page50 from './pages/admin/calculators/page';
import CustomReportBuilder from './pages/admin/reports/builder/page';
import CompaniesPage from './pages/admin/manage-companies/page';
import Page12 from './pages/dashboard/applications/page';
import Page13 from './pages/dashboard/applications/[id]/page';
import Page14 from './pages/dashboard/apply/general-loan/page';
import Page15 from './pages/dashboard/apply/page';
import Page16 from './pages/dashboard/apply/salary-advance/page';
import Page17 from './pages/dashboard/page';
import Page18 from './pages/dashboard/profile/page';
import Page19 from './pages/finance/applications/page';
import Page20 from './pages/finance/applications/pending/[id]/page';
import Page21 from './pages/finance/applications/[id]/page';
import Page22 from './pages/finance/apply/page';
import Page23 from './pages/finance/dashboard/page';
import Page24 from './pages/finance/hr-loans/page';
import Page25 from './pages/finance/hr-loans/pending/[id]/page';
import Page26 from './pages/finance/hr-loans/[id]/page';
import Page27 from './pages/finance/my-loans/page';
import Page28 from './pages/finance/page';
import Page29 from './pages/finance/profile/page';
import Page30 from './pages/forgot-password/page';
import Page31 from './pages/hr/applications/page';
import Page32 from './pages/hr/applications/pending/[id]/page';
import Page33 from './pages/hr/applications/[id]/page';
import Page34 from './pages/hr/apply/page';
import Page35 from './pages/hr/dashboard/page';
import Page36 from './pages/hr/finance-loans/page';
import Page37 from './pages/hr/ideon/page';
import Page38 from './pages/hr/my-loans/page';
import Page39 from './pages/hr/nakama/page';
import Page40 from './pages/hr/page';
import Page41 from './pages/hr/profile/page';
import Page42 from './pages/login/admin/page';
import Page43 from './pages/login/applicant/page';
import Page44 from './pages/login/finance/page';
import Page45 from './pages/login/hr/page';
import Page46 from './pages/login/page';
import Page47 from './pages/page';
import Page48 from './pages/privacy-policy/page';
import Page49 from './pages/register/page';

function App() {
  return (
    <Routes>
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="applications" element={<Page0 />} />
        <Route path="applications/:id" element={<Page1 />} />
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
        <Route path="calculators" element={<Page50 />} />
      </Route>

      {/* Finance Routes */}
      <Route path="/finance" element={<FinanceLayout />}>
        <Route path="applications" element={<Page19 />} />
        <Route path="applications/pending/:id" element={<Page20 />} />
        <Route path="applications/:id" element={<Page21 />} />
        <Route path="apply" element={<Page22 />} />
        <Route path="dashboard" element={<Page23 />} />
        <Route path="hr-loans" element={<Page24 />} />
        <Route path="hr-loans/pending/:id" element={<Page25 />} />
        <Route path="hr-loans/:id" element={<Page26 />} />
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
        <Route path="finance-loans" element={<Page36 />} />
        <Route path="ideon" element={<Page37 />} />
        <Route path="my-loans" element={<Page38 />} />
        <Route path="nakama" element={<Page39 />} />
        <Route path="" element={<Page40 />} />
        <Route path="profile" element={<Page41 />} />
      </Route>

      {/* Public Routes */}
      <Route path="/forgot-password" element={<Page30 />} />
      <Route path="/login/admin" element={<Page42 />} />
      <Route path="/login/applicant" element={<Page43 />} />
      <Route path="/login/finance" element={<Page44 />} />
      <Route path="/login/hr" element={<Page45 />} />
      <Route path="/login" element={<Page46 />} />
      <Route path="/" element={<Page47 />} />
      <Route path="/privacy-policy" element={<Page48 />} />
      <Route path="/register" element={<Page49 />} />
    </Routes>
  );
}

export default App;
