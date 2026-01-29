import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import LazyLoadErrorBoundary from "@/components/LazyLoadErrorBoundary";
import DynamicFavicon from "@/components/DynamicFavicon";
import PaletteLoader from "@/components/PaletteLoader";
import { AppShell } from "@/components/AppShell";
import { clearSupabaseAuthKeys, getCurrentPathForRedirect } from "@/lib/authStorage";

// Componentes críticos carregados imediatamente (usados no primeiro render)
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loading de todas as outras páginas para reduzir bundle inicial
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientForm = lazy(() => import("./pages/ClientForm"));
const Equipment = lazy(() => import("./pages/Equipment"));
const EquipmentForm = lazy(() => import("./pages/EquipmentForm"));
const Technicians = lazy(() => import("./pages/Technicians"));
const TechnicianForm = lazy(() => import("./pages/TechnicianForm"));
const ServiceCalls = lazy(() => import("./pages/ServiceCalls"));
const ServiceCallView = lazy(() => import("./pages/ServiceCallView"));
const ServiceCallForm = lazy(() => import("./pages/ServiceCallForm"));
const ServiceTypes = lazy(() => import("./pages/ServiceTypes"));
const ServiceTypeForm = lazy(() => import("./pages/ServiceTypeForm"));
const ServiceCallStatuses = lazy(() => import("./pages/ServiceCallStatuses"));
const ServiceCallStatusForm = lazy(() => import("./pages/ServiceCallStatusForm"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Checklists = lazy(() => import("./pages/Checklists"));
const ChecklistForm = lazy(() => import("./pages/ChecklistForm"));
const Settings = lazy(() => import("./pages/Settings"));
const CadastrosClientesFornecedores = lazy(() => import("./pages/CadastrosClientesFornecedores"));
const CadastroDetail = lazy(() => import("./pages/CadastroDetail"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const RelatorioOS = lazy(() => import("./pages/relatorio-os/[osNumber]"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const VehicleForm = lazy(() => import("./pages/VehicleForm"));
const VehicleMaintenances = lazy(() => import("./pages/VehicleMaintenances"));
const ServiceCallTrips = lazy(() => import("./pages/ServiceCallTrips"));
const Install = lazy(() => import("./pages/Install"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Products = lazy(() => import("./pages/Products"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const PaymentMethodForm = lazy(() => import("./pages/PaymentMethodForm"));
const TechnicianReimbursements = lazy(() => import("./pages/TechnicianReimbursements"));

// Módulo Finanças
const ContasAPagar = lazy(() => import("./pages/financas/ContasAPagar"));
const ContasAReceber = lazy(() => import("./pages/financas/ContasAReceber"));
const FluxoDeCaixa = lazy(() => import("./pages/financas/FluxoDeCaixa"));
const ConfiguracoesFinanceiras = lazy(() => import("./pages/financas/ConfiguracoesFinanceiras"));

// QueryClient otimizado para performance mobile
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // 1 minuto - dados são considerados frescos
      gcTime: 5 * 60 * 1000,     // 5 minutos no cache
      retry: 1,                   // Menos retries = mais rápido em caso de falha
      refetchOnWindowFocus: false, // Não refetch ao focar - importante para mobile
      refetchOnReconnect: true,   // Refetch ao reconectar
    },
  },
});

// Loading fallback leve para Suspense
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Carregando...</div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const didCleanupRef = useRef(false);

  useEffect(() => {
    // Set up listener FIRST to not miss any auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle cleanup and redirect when session is null (after loading)
  useEffect(() => {
    if (loading) return;
    if (session) {
      // Reset cleanup flag when we have a valid session
      didCleanupRef.current = false;
      return;
    }
    // Session is null and we're not loading
    if (!didCleanupRef.current && !location.pathname.startsWith("/auth")) {
      didCleanupRef.current = true;
      // Clean up any stale auth tokens
      supabase.auth.signOut({ scope: "local" }).catch(() => {
        // Ignore signOut errors, we're cleaning up anyway
      });
      clearSupabaseAuthKeys(localStorage);
    }
  }, [loading, session, location.pathname]);

  if (loading) {
    return <PageLoader />;
  }

  if (!session) {
    // Build redirect URL with current path
    const currentPath = getCurrentPathForRedirect(location);
    const redirectTo = `/auth?redirect=${encodeURIComponent(currentPath)}`;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

const CadastroRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/cadastros/clientes/${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppShell>
        <DynamicFavicon />
        <PaletteLoader />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LazyLoadErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/relatorio-os/:osNumber/:token" element={<RelatorioOS />} />
            <Route path="/install" element={<Install />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inicio"
              element={
                <ProtectedRoute>
                  <Inicio />
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
              path="/cadastros/clientes/:id"
              element={
                <ProtectedRoute>
                  <CadastroDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cadastros/clientes/:id/editar"
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
                  <CadastroRedirect />
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
              path="/products"
              element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/new"
              element={
                <ProtectedRoute>
                  <ProductForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <ProtectedRoute>
                  <ProductForm />
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
              path="/service-calls/:id"
              element={
                <ProtectedRoute>
                  <ServiceCallForm />
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
              path="/service-call-statuses"
              element={
                <ProtectedRoute>
                  <ServiceCallStatuses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-call-statuses/new"
              element={
                <ProtectedRoute>
                  <ServiceCallStatusForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-call-statuses/:id/edit"
              element={
                <ProtectedRoute>
                  <ServiceCallStatusForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <Vehicles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/new"
              element={
                <ProtectedRoute>
                  <VehicleForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:id/edit"
              element={
                <ProtectedRoute>
                  <VehicleForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicle-maintenances"
              element={
                <ProtectedRoute>
                  <VehicleMaintenances />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service-call-trips"
              element={
                <ProtectedRoute>
                  <ServiceCallTrips />
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
              path="/technician-reimbursements"
              element={
                <ProtectedRoute>
                  <TechnicianReimbursements />
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
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-methods"
              element={
                <ProtectedRoute>
                  <PaymentMethods />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-methods/new"
              element={
                <ProtectedRoute>
                  <PaymentMethodForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-methods/edit/:id"
              element={
                <ProtectedRoute>
                  <PaymentMethodForm />
                </ProtectedRoute>
              }
            />
            {/* MÓDULO FINANÇAS - Admin Only */}
            <Route
              path="/financas/contas-a-pagar"
              element={
                <ProtectedRoute>
                  <ContasAPagar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financas/contas-a-receber"
              element={
                <ProtectedRoute>
                  <ContasAReceber />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financas/fluxo-de-caixa"
              element={
                <ProtectedRoute>
                  <FluxoDeCaixa />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financas/configuracoes"
              element={
                <ProtectedRoute>
                  <ConfiguracoesFinanceiras />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </LazyLoadErrorBoundary>
        </BrowserRouter>
      </AppShell>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
