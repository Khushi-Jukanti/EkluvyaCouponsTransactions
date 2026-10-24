import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import Index from "./pages/Index";
import Login from "./pages/Login";
import ValidateData from "./pages/ValidateData";
import DataEntryAuth from "./pages/DataEntryAuth";
import DataEntryHistory from "./pages/DataEntryHistory";
import DataEntryLayout from "./layouts/DataEntryLayout";
import ChangePassword from "./pages/ChangePassword";
import AgentDashboard from "./pages/AgentDashboard";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "@/components/ProtectedRoute";
import AccountantLayout from "@/layouts/AccountantLayout";
import SubscriptionManagement from "@/pages/accountant/SubscriptionManagement";
import SchoolStudentsManagement from "@/pages/accountant/SchoolStudentsManagement";
import ImportHistory from "@/pages/accountant/ImportHistory";
import StudentVerification from "@/pages/accountant/StudentVerification";

const queryClient = new QueryClient();

const AdminDashboardEntry = () => {
  const role = localStorage.getItem("role");

  if (role === "accountant") {
    return <Navigate to="subscription-management" replace />;
  }

  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/" element={<Login />} />
          <Route path="/data-entry/login" element={<Navigate to="/" replace />} />
          <Route path="/data-entry/register" element={<DataEntryAuth />} />
          <Route element={<DataEntryLayout />}>
            <Route path="/validate" element={<ValidateData />} />
            <Route path="/data-entry/history" element={<DataEntryHistory />} />
            <Route path="/data-entry/history/:importId" element={<DataEntryHistory />} />
          </Route>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ADMIN ROUTES */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role={["admin", "accountant"]}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<AdminDashboardEntry />}
            />
            <Route
              element={
                <ProtectedRoute role="accountant">
                  <AccountantLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="subscription-management"
                element={<SubscriptionManagement />}
              />
              <Route
                path="school-students-management"
                element={<SchoolStudentsManagement />}
              />
              <Route
                path="import-history"
                element={<ImportHistory />}
              />
              <Route path="student-verification" element={<StudentVerification key="review-list" />} />
              <Route path="student-verification/:importId" element={<StudentVerification key="review-details" />} />
            </Route>
          </Route>

          {/* AGENT ROUTES */}
          <Route
            path="/agent/dashboard"
            element={
              <ProtectedRoute role="agent">
                <AgentDashboard />
              </ProtectedRoute>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
