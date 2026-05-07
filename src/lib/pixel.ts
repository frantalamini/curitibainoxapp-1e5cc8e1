/**
 * Meta Pixel — Curitiba Inox
 * Pixel ID: 2988705001312043
 *
 * Uso:
 *   import { pixel } from '@/lib/pixel';
 *   pixel.viewOSReport('OS-001');
 *   pixel.newServiceCall({ value: 350, clientName: 'João' });
 */

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = "2988705001312043";

// Garante que o fbq existe antes de chamar (SSR safe / fallback)
function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

// ─────────────────────────────────────────────
// Eventos Padrão Meta (Standard Events)
// ─────────────────────────────────────────────

/** Dispara PageView em mudança de rota (usado pelo PixelPageTracker) */
export function trackPageView() {
  fbq("track", "PageView");
}

/** Usuário visualizou conteúdo relevante (OS, cliente, relatório) */
export function trackViewContent(params: {
  content_name: string;
  content_category?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
}) {
  fbq("track", "ViewContent", {
    currency: "BRL",
    ...params,
  });
}

/** Lead gerado — novo cliente cadastrado, novo contato, nova OS */
export function trackLead(params?: {
  content_name?: string;
  value?: number;
  currency?: string;
}) {
  fbq("track", "Lead", {
    currency: "BRL",
    ...params,
  });
}

/** Contato/acesso ao sistema — auth page visitada */
export function trackContact() {
  fbq("track", "Contact");
}

/** Cadastro completo — novo usuário registrado */
export function trackCompleteRegistration(params?: { value?: number }) {
  fbq("track", "CompleteRegistration", {
    currency: "BRL",
    ...params,
  });
}

/** Compra/venda finalizada — OS paga, venda concluída */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
}) {
  fbq("track", "Purchase", {
    currency: "BRL",
    ...params,
  });
}

/** Início de checkout — venda iniciada, proposta gerada */
export function trackInitiateCheckout(params?: {
  value?: number;
  num_items?: number;
  content_name?: string;
}) {
  fbq("track", "InitiateCheckout", {
    currency: "BRL",
    ...params,
  });
}

/** Busca realizada dentro do sistema */
export function trackSearch(params: { search_string: string }) {
  fbq("track", "Search", params);
}

/** Agendamento/consulta marcada */
export function trackSchedule() {
  fbq("track", "Schedule");
}

/** Submissão de formulário */
export function trackSubmitApplication(params?: { content_name?: string }) {
  fbq("track", "SubmitApplication", params);
}

// ─────────────────────────────────────────────
// Eventos Customizados — Curitiba Inox
// ─────────────────────────────────────────────

/** Cliente visualizou relatório público de OS */
export function trackViewOSReport(osNumber: string) {
  fbq("trackCustom", "ViewOSReport", {
    os_number: osNumber,
    content_name: `Relatório OS ${osNumber}`,
  });
}

/** Login realizado com sucesso no app */
export function trackLoginApp(params?: { user_role?: string }) {
  fbq("trackCustom", "LoginApp", {
    ...params,
  });
}

/** Nova Ordem de Serviço criada */
export function trackNewServiceCall(params?: {
  client_name?: string;
  service_type?: string;
  value?: number;
}) {
  fbq("trackCustom", "NewServiceCall", {
    currency: "BRL",
    ...params,
  });
}

/** Nova venda criada no módulo Vendas */
export function trackNewSale(params?: {
  client_name?: string;
  value?: number;
  items?: number;
}) {
  fbq("trackCustom", "NewSale", {
    currency: "BRL",
    ...params,
  });
}

/** Novo cliente cadastrado */
export function trackNewClient(params?: { client_type?: string }) {
  fbq("trackCustom", "NewClient", params);
}

/** Usuário acessou o Dashboard Financeiro */
export function trackViewFinanceiro() {
  fbq("trackCustom", "ViewFinanceiro");
}

/** OS marcada como concluída/paga */
export function trackServiceCallCompleted(params?: {
  os_number?: string;
  value?: number;
}) {
  fbq("trackCustom", "ServiceCallCompleted", {
    currency: "BRL",
    ...params,
  });
}

/** Relatório gerado (rentabilidade, DRE, fluxo de caixa) */
export function trackReportGenerated(reportName: string) {
  fbq("trackCustom", "ReportGenerated", {
    report_name: reportName,
  });
}

/** Install do PWA (tela /install) */
export function trackPWAInstall() {
  fbq("trackCustom", "PWAInstall");
}

// ─────────────────────────────────────────────
// Objeto agrupado para import conveniente
// ─────────────────────────────────────────────

export const pixel = {
  // Padrão
  pageView: trackPageView,
  viewContent: trackViewContent,
  lead: trackLead,
  contact: trackContact,
  completeRegistration: trackCompleteRegistration,
  purchase: trackPurchase,
  initiateCheckout: trackInitiateCheckout,
  search: trackSearch,
  schedule: trackSchedule,
  submitApplication: trackSubmitApplication,

  // Customizados
  viewOSReport: trackViewOSReport,
  loginApp: trackLoginApp,
  newServiceCall: trackNewServiceCall,
  newSale: trackNewSale,
  newClient: trackNewClient,
  viewFinanceiro: trackViewFinanceiro,
  serviceCallCompleted: trackServiceCallCompleted,
  reportGenerated: trackReportGenerated,
  pwaInstall: trackPWAInstall,
};

export default pixel;
