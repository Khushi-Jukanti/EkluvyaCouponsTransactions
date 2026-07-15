import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import Index from "./pages/Index";
import Login from "./pages/Login";
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
