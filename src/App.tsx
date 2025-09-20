import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AccountPage } from "@/pages/AccountPage";
import { ProductsPage } from "@/pages/ProductsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="products" element={<ProductsPage />} />
              
              {/* Placeholder routes - will be implemented */}
              <Route path="financial" element={<div className="p-6"><h1 className="text-2xl font-bold">Financeiro - Em Desenvolvimento</h1></div>} />
              <Route path="forecasts" element={<div className="p-6"><h1 className="text-2xl font-bold">Previsões - Em Desenvolvimento</h1></div>} />
              <Route path="accounts" element={<div className="p-6"><h1 className="text-2xl font-bold">Contas - Em Desenvolvimento</h1></div>} />
              <Route path="reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Relatórios - Em Desenvolvimento</h1></div>} />
              <Route path="notifications" element={<div className="p-6"><h1 className="text-2xl font-bold">Notificações - Em Desenvolvimento</h1></div>} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
