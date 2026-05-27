import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import EvaluationPage from "./pages/EvaluationPage.jsx";
import AccessDeniedPage from "./pages/AccessDeniedPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LogsPage from "./pages/LogsPage.jsx";
import OperatorReviewsPage from "./pages/OperatorReviewsPage.jsx";
import PromptsPage from "./pages/PromptsPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";
import ReviewStatusLookupPage from "./pages/ReviewStatusLookupPage.jsx";
import ReviewStatusPage from "./pages/ReviewStatusPage.jsx";
import AiProvidersPage from "./pages/AiProvidersPage.jsx";
import AdminPhrasesPage from "./pages/admin/AdminPhrasesPage.jsx";
import AdminScenariosPage from "./pages/admin/AdminScenariosPage.jsx";
import AdminSentimentsPage from "./pages/admin/AdminSentimentsPage.jsx";
import AdminTemplatesPage from "./pages/admin/AdminTemplatesPage.jsx";
import ClientLayout from "./layouts/ClientLayout.jsx";
import CompanyLayout from "./layouts/CompanyLayout.jsx";
import CompanyHomePage from "./pages/company/CompanyHomePage.jsx";
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
              <ProtectedRoute allowed={[ROLES.OPERATOR]}>
                <OperatorReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompts"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <PromptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluation"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <EvaluationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <LogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/ai-providers"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <AiProvidersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/phrases"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <AdminPhrasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <AdminTemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/scenarios"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <AdminScenariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sentiments"
            element={
              <ProtectedRoute allowed={[ROLES.ADMINISTRATOR]}>
                <AdminSentimentsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
