import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import LazyLoadErrorBoundary from "@/components/LazyLoadErrorBoundary";
import DynamicFavicon from "@/components/DynamicFavicon";
import PixelPageTracker from "@/components/PixelPageTracker";
import PaletteLoader from "@/components/PaletteLoader";
import { AppShell } from "@/components/AppShell";
import {
  clearSupabaseAuthKeys,
  getCurrentPathForRedirect,
} from "@/lib/authStorage";
import { RoutePermissionGuard } from "@/components/PermissionGuard";

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
const ServiceCallStatusForm = lazy(
  () => import("./pages/ServiceCallStatusForm"),
);
const Schedule = lazy(() => import("./pages/Schedule"));
const Checklists = lazy(() => import("./pages/Checklists"));
const ChecklistForm = lazy(() => import("./pages/ChecklistForm"));
const Settings = lazy(() => import("./pages/Settings"));
const CadastrosClientesFornecedores = lazy(
  () => import("./pages/CadastrosClientesFornecedores"),
);
const CadastroDetail = lazy(() => import("./pages/CadastroDetail"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const RelatorioOS = lazy(() => import("./pages/relatorio-os/[osNumber]"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const VehicleForm = lazy(() => import("./pages/VehicleForm"));
const VehicleMaintenances = lazy(() => import("./pages/VehicleMaintenances"));
const ServiceCallTrips = lazy(() => import("./pages/ServiceCallTrips"));
const TechnicianMap = lazy(() => import("./pages/TechnicianMap"));
const Install = lazy(() => import("./pages/Install"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Products = lazy(() => import("./pages/Products"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const PaymentMethodForm = lazy(() => import("./pages/PaymentMethodForm"));
const TechnicianReimbursements = lazy(
  () => import("./pages/TechnicianReimbursements"),
);

// Módulo Finanças
const DashboardFinanceiro = lazy(
  () => import("./pages/financas/DashboardFinanceiro"),
);
const ContasAPagar = lazy(() => import("./pages/financas/ContasAPagar"));
const ContasAReceber = lazy(() => import("./pages/financas/ContasAReceber"));
const FluxoDeCaixa = lazy(() => import("./pages/financas/FluxoDeCaixa"));
const ConfiguracoesFinanceiras = lazy(
  () => import("./pages/financas/ConfiguracoesFinanceiras"),
);
const CartoesCredito = lazy(() => import("./pages/financas/CartoesCredito"));
const DRE = lazy(() => import("./pages/financas/DRE"));
const RentabilidadeOS = lazy(() => import("./pages/financas/RentabilidadeOS"));
const RelatorioCentroCusto = lazy(
  () => import("./pages/financas/RelatorioCentroCusto"),
);
const CustosPorTecnico = lazy(
  () => import("./pages/financas/CustosPorTecnico"),
);
const CustosPorVeiculo = lazy(
  () => import("./pages/financas/CustosPorVeiculo"),
);
const SatisfacaoTecnicos = lazy(() => import("./pages/SatisfacaoTecnicos"));
const ConciliacaoBancaria = lazy(
  () => import("./pages/financas/ConciliacaoBancaria"),
);
const OrcamentoMensal = lazy(() => import("./pages/financas/OrcamentoMensal"));
const DespesasRecorrentes = lazy(
  () => import("./pages/financas/DespesasRecorrentes"),
);

// Módulo Vendas
const Sales = lazy(() => import("./pages/vendas/Sales"));
const SaleForm = lazy(() => import("./pages/vendas/SaleForm"));
const SaleDeliveries = lazy(() => import("./pages/vendas/SaleDeliveries"));
const SaleDeliveryFlow = lazy(() => import("./pages/vendas/SaleDeliveryFlow"));

// Compras
const PurchaseRequests = lazy(() => import("./pages/compras/PurchaseRequests"));
const PurchaseRequestForm = lazy(
  () => import("./pages/compras/PurchaseRequestForm"),
);
const PurchaseQuotations = lazy(
  () => import("./pages/compras/PurchaseQuotations"),
);
const PurchaseQuotationForm = lazy(
  () => import("./pages/compras/PurchaseQuotationForm"),
);
const PurchaseQuotationMap = lazy(
  () => import("./pages/compras/PurchaseQuotationMap"),
);
const PurchaseOrders = lazy(() => import("./pages/compras/PurchaseOrders"));
const PurchaseOrderForm = lazy(
  () => import("./pages/compras/PurchaseOrderForm"),
);
const PurchaseReceipts = lazy(() => import("./pages/compras/PurchaseReceipts"));
const PurchaseReceiptForm = lazy(
  () => import("./pages/compras/PurchaseReceiptForm"),
);
const PurchaseInvoices = lazy(() => import("./pages/compras/PurchaseInvoices"));
const PurchaseInvoiceForm = lazy(
  () => import("./pages/compras/PurchaseInvoiceForm"),
);
const PurchaseApprovals = lazy(
  () => import("./pages/compras/PurchaseApprovals"),
);
const PurchaseDashboard = lazy(
  () => import("./pages/compras/PurchaseDashboard"),
);

// Configurações — subpáginas
const PerfisAcesso = lazy(() => import("./pages/settings/PerfisAcesso"));
const GerenciadorPermissoes = lazy(
  () => import("./pages/settings/GerenciadorPermissoes"),
);
const ConfiguracoesFiscais = lazy(
  () => import("./pages/settings/ConfiguracoesFiscais"),
);

// Pendências
const Pendencias = lazy(() => import("./pages/Pendencias"));
const BaseConhecimento = lazy(() => import("./pages/ai/BaseConhecimento"));

// Módulo QR Code
const QRCodeHome = lazy(() => import("./pages/qr-code/QRCodeHome"));
const QRProducts = lazy(() => import("./pages/qr-code/QRProducts"));
const QRProductForm = lazy(() => import("./pages/qr-code/QRProductForm"));
const QRTemplates = lazy(() => import("./pages/qr-code/QRTemplates"));
const QRTemplateEditor = lazy(() => import("./pages/qr-code/QRTemplateEditor"));
const QRGenerateFabricated = lazy(
  () => import("./pages/qr-code/QRGenerateFabricated"),
);
const QRGenerateAssistance = lazy(
  () => import("./pages/qr-code/QRGenerateAssistance"),
);
const QRSettings = lazy(() => import("./pages/qr-code/QRSettings"));
const QRPublicHub = lazy(() => import("./pages/qr-code/QRPublicHub"));

// QueryClient otimizado para performance mobile
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 minutos - reduz chamadas desnecessárias
      gcTime: 10 * 60 * 1000, // 10 minutos no cache
      retry: 1,
      refetchOnWindowFocus: false, // Evita cascata de queries ao trocar de aba
      refetchOnReconnect: true,
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
          <PixelPageTracker />
          <LazyLoadErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/auth/reset-password"
                  element={<ResetPassword />}
                />
                <Route
                  path="/relatorio-os/:osNumber/:token"
                  element={<RelatorioOS />}
                />
                <Route path="/install" element={<Install />} />
                <Route path="/qr/:code" element={<QRPublicHub />} />
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
                      <RoutePermissionGuard
                        module="relatorios_dashboard"
                        action="can_view"
                      >
                        <Dashboard />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clients"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="clients" action="can_view">
                        <Clients />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros/clientes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="clients" action="can_view">
                        <CadastrosClientesFornecedores />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros/novo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="clients"
                        action="can_create"
                      >
                        <ClientForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros/clientes/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="clients" action="can_view">
                        <CadastroDetail />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros/clientes/:id/editar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="clients" action="can_edit">
                        <ClientForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cadastros/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="clients" action="can_view">
                        <CadastroRedirect />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clients/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="clients"
                        action="can_create"
                      >
                        <ClientForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clients/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="clients" action="can_edit">
                        <ClientForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipment"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="equipment"
                        action="can_view"
                      >
                        <Equipment />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipment/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="equipment"
                        action="can_create"
                      >
                        <EquipmentForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipment/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="equipment"
                        action="can_edit"
                      >
                        <EquipmentForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_view">
                        <Products />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="products"
                        action="can_create"
                      >
                        <ProductForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_edit">
                        <ProductForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technicians"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="technicians"
                        action="can_view"
                      >
                        <Technicians />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technicians/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="technicians"
                        action="can_create"
                      >
                        <TechnicianForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technicians/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="technicians"
                        action="can_edit"
                      >
                        <TechnicianForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-calls"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_calls"
                        action="can_view"
                        allowRoles={["technician"]}
                      >
                        <ServiceCalls />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-calls/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_calls"
                        action="can_view"
                        allowRoles={["technician"]}
                      >
                        <ServiceCallForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-calls/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_calls"
                        action="can_create"
                      >
                        <ServiceCallForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-calls/edit/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_calls"
                        action="can_edit"
                        allowRoles={["technician"]}
                      >
                        <ServiceCallForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-types"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_types"
                        action="can_view"
                      >
                        <ServiceTypes />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-types/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_types"
                        action="can_create"
                      >
                        <ServiceTypeForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-types/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_types"
                        action="can_edit"
                      >
                        <ServiceTypeForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-call-statuses"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_statuses"
                        action="can_view"
                      >
                        <ServiceCallStatuses />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-call-statuses/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_statuses"
                        action="can_create"
                      >
                        <ServiceCallStatusForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-call-statuses/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="service_statuses"
                        action="can_edit"
                      >
                        <ServiceCallStatusForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicles"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="vehicles" action="can_view">
                        <Vehicles />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicles/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="vehicles"
                        action="can_create"
                      >
                        <VehicleForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicles/:id/edit"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="vehicles" action="can_edit">
                        <VehicleForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicle-maintenances"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="relatorios_manutencoes"
                        action="can_view"
                      >
                        <VehicleMaintenances />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/service-call-trips"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="relatorios_deslocamentos"
                        action="can_view"
                      >
                        <ServiceCallTrips />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technician-map"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="technician_map"
                        action="can_view"
                      >
                        <TechnicianMap />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/schedule"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="schedule" action="can_view">
                        <Schedule />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technician-reimbursements"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="reimbursements"
                        action="can_view"
                        allowRoles={["technician"]}
                      >
                        <TechnicianReimbursements />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checklists"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="checklists"
                        action="can_view"
                      >
                        <Checklists />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checklists/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="checklists"
                        action="can_create"
                      >
                        <ChecklistForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checklists/edit/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="checklists"
                        action="can_edit"
                      >
                        <ChecklistForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="settings" action="can_view">
                        <Settings />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="users" action="can_view">
                        <UserManagement />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment-methods"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="payment_methods"
                        action="can_view"
                      >
                        <PaymentMethods />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment-methods/new"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="payment_methods"
                        action="can_create"
                      >
                        <PaymentMethodForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment-methods/edit/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="payment_methods"
                        action="can_edit"
                      >
                        <PaymentMethodForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                {/* ============================================================
                MÓDULO FINANÇAS — Protegido por perfil (can_view: finances)
                Qualquer rota abaixo exige permissão de VISUALIZAR finanças.
                Técnico é bloqueado em todas as camadas: rota, componente e RLS.
            ============================================================ */}
                <Route
                  path="/financas/dashboard"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="finances" action="can_view">
                        <DashboardFinanceiro />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/contas-a-pagar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_contas_pagar"
                        action="can_view"
                      >
                        <ContasAPagar />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/contas-a-receber"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_contas_receber"
                        action="can_view"
                      >
                        <ContasAReceber />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/fluxo-de-caixa"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_fluxo"
                        action="can_view"
                      >
                        <FluxoDeCaixa />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/configuracoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_config"
                        action="can_view"
                      >
                        <ConfiguracoesFinanceiras />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/cartoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_cartoes"
                        action="can_view"
                      >
                        <CartoesCredito />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/dre"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_dre"
                        action="can_view"
                      >
                        <DRE />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/rentabilidade-os"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_rentabilidade"
                        action="can_view"
                      >
                        <RentabilidadeOS />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/centro-de-custo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_centro_custo"
                        action="can_view"
                      >
                        <RelatorioCentroCusto />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/custos-por-tecnico"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_custos_tecnico"
                        action="can_view"
                      >
                        <CustosPorTecnico />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/custos-por-veiculo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_custos_veiculo"
                        action="can_view"
                      >
                        <CustosPorVeiculo />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/technical-indicators"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="relatorios_indicadores"
                        action="can_view"
                      >
                        <SatisfacaoTecnicos />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/conciliacao-bancaria"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_conciliacao"
                        action="can_view"
                      >
                        <ConciliacaoBancaria />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/orcamento-mensal"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_orcamento"
                        action="can_view"
                      >
                        <OrcamentoMensal />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financas/despesas-recorrentes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="financas_recorrentes"
                        action="can_view"
                      >
                        <DespesasRecorrentes />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                {/* Configurações — subpáginas (somente Gerencial) */}
                <Route
                  path="/settings/perfis-acesso"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="settings" action="can_view">
                        <PerfisAcesso />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/permissoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="settings" action="can_view">
                        <GerenciadorPermissoes />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/fiscal"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="settings" action="can_view">
                        <ConfiguracoesFiscais />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                {/* MÓDULO VENDAS */}
                <Route
                  path="/vendas"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="vendas" action="can_view">
                        <Sales />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendas/novo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="vendas" action="can_create">
                        <SaleForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendas/:id/editar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="vendas" action="can_edit">
                        <SaleForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendas/entregas"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="vendas_entregas"
                        action="can_view"
                      >
                        <SaleDeliveries />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendas/entregas/:routeGroupId"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="vendas_entregas"
                        action="can_view"
                      >
                        <SaleDeliveryFlow />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                {/* COMPRAS */}
                <Route
                  path="/compras/solicitacoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_solicitacoes"
                        action="can_view"
                      >
                        <PurchaseRequests />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/solicitacoes/nova"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_solicitacoes"
                        action="can_create"
                      >
                        <PurchaseRequestForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/solicitacoes/:id/editar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_solicitacoes"
                        action="can_edit"
                      >
                        <PurchaseRequestForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/cotacoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_cotacoes"
                        action="can_view"
                      >
                        <PurchaseQuotations />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/cotacoes/nova"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_cotacoes"
                        action="can_create"
                      >
                        <PurchaseQuotationForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/cotacoes/:id/editar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_cotacoes"
                        action="can_edit"
                      >
                        <PurchaseQuotationForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/mapa-cotacoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_cotacoes"
                        action="can_view"
                      >
                        <PurchaseQuotationMap />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/pedidos"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_pedidos"
                        action="can_view"
                      >
                        <PurchaseOrders />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/pedidos/novo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_pedidos"
                        action="can_create"
                      >
                        <PurchaseOrderForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/pedidos/:id/editar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_pedidos"
                        action="can_edit"
                      >
                        <PurchaseOrderForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/recebimentos"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_recebimentos"
                        action="can_view"
                      >
                        <PurchaseReceipts />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/recebimentos/novo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_recebimentos"
                        action="can_create"
                      >
                        <PurchaseReceiptForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/recebimentos/:id/editar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_recebimentos"
                        action="can_edit"
                      >
                        <PurchaseReceiptForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/notas-entrada"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_nf_entrada"
                        action="can_view"
                      >
                        <PurchaseInvoices />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/notas-entrada/nova"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_nf_entrada"
                        action="can_create"
                      >
                        <PurchaseInvoiceForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/notas-entrada/:id/editar"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="compras_nf_entrada"
                        action="can_edit"
                      >
                        <PurchaseInvoiceForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/aprovacoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="compras" action="can_view">
                        <PurchaseApprovals />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras/indicadores"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="compras" action="can_view">
                        <PurchaseDashboard />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                {/* PENDÊNCIAS */}
                <Route
                  path="/pendencias"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="pendencias"
                        action="can_view"
                      >
                        <Pendencias />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                {/* MÓDULO QR CODE */}
                <Route
                  path="/qr-code"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_view">
                        <QRCodeHome />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/produtos"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_view">
                        <QRProducts />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/produtos/novo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="products"
                        action="can_create"
                      >
                        <QRProductForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/produtos/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_edit">
                        <QRProductForm />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/templates"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_view">
                        <QRTemplates />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/templates/novo"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard
                        module="products"
                        action="can_create"
                      >
                        <QRTemplateEditor />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/templates/:id"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_edit">
                        <QRTemplateEditor />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/fabricados"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_view">
                        <QRGenerateFabricated />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/assistencia"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="products" action="can_view">
                        <QRGenerateAssistance />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr-code/configuracoes"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="settings" action="can_view">
                        <QRSettings />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route
                  path="/ai/base-conhecimento"
                  element={
                    <ProtectedRoute>
                      <RoutePermissionGuard module="ia" action="can_view">
                        <BaseConhecimento />
                      </RoutePermissionGuard>
                    </ProtectedRoute>
                  }
                />
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
