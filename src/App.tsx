import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import Equipment from "./pages/Equipment";
import EquipmentForm from "./pages/EquipmentForm";
import Technicians from "./pages/Technicians";
import TechnicianForm from "./pages/TechnicianForm";
import ServiceCalls from "./pages/ServiceCalls";
import ServiceCallForm from "./pages/ServiceCallForm";
import ServiceTypes from "./pages/ServiceTypes";
import ServiceTypeForm from "./pages/ServiceTypeForm";
import Schedule from "./pages/Schedule";
import Checklists from "./pages/Checklists";
import ChecklistForm from "./pages/ChecklistForm";
import Settings from "./pages/Settings";
import CadastrosClientesFornecedores from "./pages/CadastrosClientesFornecedores";
import CadastroDetail from "./pages/CadastroDetail";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Carregando...</div>
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/auth" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cadastros/clientes"
            element={
              <ProtectedRoute>
                <CadastrosClientesFornecedores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cadastros/novo"
            element={
              <ProtectedRoute>
                <ClientForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cadastros/:id"
            element={
              <ProtectedRoute>
                <CadastroDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cadastros/:id/editar"
            element={
              <ProtectedRoute>
                <ClientForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/new"
            element={
              <ProtectedRoute>
                <ClientForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id/edit"
            element={
              <ProtectedRoute>
                <ClientForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <Equipment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/new"
            element={
              <ProtectedRoute>
                <EquipmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/:id/edit"
            element={
              <ProtectedRoute>
                <EquipmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technicians"
            element={
              <ProtectedRoute>
                <Technicians />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technicians/new"
            element={
              <ProtectedRoute>
                <TechnicianForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technicians/:id/edit"
            element={
              <ProtectedRoute>
                <TechnicianForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-calls"
            element={
              <ProtectedRoute>
                <ServiceCalls />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-calls/new"
            element={
              <ProtectedRoute>
                <ServiceCallForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-calls/edit/:id"
            element={
              <ProtectedRoute>
                <ServiceCallForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-types"
            element={
              <ProtectedRoute>
                <ServiceTypes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-types/new"
            element={
              <ProtectedRoute>
                <ServiceTypeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service-types/:id/edit"
            element={
              <ProtectedRoute>
                <ServiceTypeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <Schedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists"
            element={
              <ProtectedRoute>
                <Checklists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists/new"
            element={
              <ProtectedRoute>
                <ChecklistForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists/edit/:id"
            element={
              <ProtectedRoute>
                <ChecklistForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
