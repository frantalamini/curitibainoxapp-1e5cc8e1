import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Clients from "./pages/Clients";
import ClientForm from "./pages/ClientForm";
import Equipment from "./pages/Equipment";
import EquipmentForm from "./pages/EquipmentForm";
import Technicians from "./pages/Technicians";
import TechnicianForm from "./pages/TechnicianForm";
import ServiceCalls from "./pages/ServiceCalls";
import ServiceCallForm from "./pages/ServiceCallForm";
import Schedule from "./pages/Schedule";

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
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
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
            path="/schedule"
            element={
              <ProtectedRoute>
                <Schedule />
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
