import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import EvaluationPage from "./pages/EvaluationPage.jsx";
import AccessDeniedPage from "./pages/AccessDeniedPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LegendPage from "./pages/LegendPage.jsx";
import OperatorReviewsPage from "./pages/OperatorReviewsPage.jsx";
import PromptsPage from "./pages/PromptsPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";
import ReviewStatusLookupPage from "./pages/ReviewStatusLookupPage.jsx";
import ReviewStatusPage from "./pages/ReviewStatusPage.jsx";
import AiProvidersPage from "./pages/AiProvidersPage.jsx";
import SystemSettingsPage from "./pages/SystemSettingsPage.jsx";
import AdminPhrasesPage from "./pages/admin/AdminPhrasesPage.jsx";
import AdminScenariosPage from "./pages/admin/AdminScenariosPage.jsx";
import AdminSentimentsPage from "./pages/admin/AdminSentimentsPage.jsx";
import AdminResponseCasesPage from "./pages/admin/AdminResponseCasesPage.jsx";
import AdminChQualityPage from "./pages/admin/AdminChQualityPage.jsx";
import AdminTemplatesPage from "./pages/admin/AdminTemplatesPage.jsx";
import ClientLayout from "./layouts/ClientLayout.jsx";
import CompanyLayout from "./layouts/CompanyLayout.jsx";
import CompanyHomePage from "./pages/company/CompanyHomePage.jsx";
import LogsWorkspace from "./ops/observability/LogsWorkspace.jsx";
import AuditWorkspace from "./ops/observability/AuditWorkspace.jsx";
import { ROLES } from "./lib/role.js";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Client contour */}
        <Route element={<ClientLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/status" element={<ReviewStatusLookupPage />} />
          <Route path="/review/status/:requestNumber" element={<ReviewStatusPage />} />
        </Route>

        {/* Company contour */}
        <Route element={<CompanyLayout />}>
          <Route path="/company" element={<CompanyHomePage />} />

          <Route
            path="/operator/reviews"
            element={
              <ProtectedRoute allowed={[ROLES.OPERATOR, ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <OperatorReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompts"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <PromptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <EvaluationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <LogsWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AuditWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/legend"
            element={
              <ProtectedRoute allowed={[ROLES.OPERATOR, ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <LegendPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/ai-providers"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AiProvidersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/system"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <SystemSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/phrases"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AdminPhrasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AdminTemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scenarios"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AdminScenariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sentiments"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AdminSentimentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/response-cases"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AdminResponseCasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ch-quality"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR, ROLES.DEMO]}>
                <AdminChQualityPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
