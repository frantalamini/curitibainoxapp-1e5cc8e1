/**
 * Meta Pixel — Curitiba Inox
 * Pixel ID: 2988705001312043
 *
 * SEGURANÇA: Apenas eventos anônimos em páginas PÚBLICAS.
 * Nenhum dado pessoal (PII) é enviado ao Facebook.
 */

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = "2988705001312043";

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

export function trackPageView() {
  fbq("track", "PageView");
}

export function trackContact() {
  fbq("track", "Contact");
}

export function trackCompleteRegistration() {
  fbq("track", "CompleteRegistration", { currency: "BRL" });
}

export function trackViewOSReport() {
  fbq("trackCustom", "ViewOSReport");
}

export function trackPWAInstall() {
  fbq("trackCustom", "PWAInstall");
}

export const pixel = {
  pageView: trackPageView,
  contact: trackContact,
  completeRegistration: trackCompleteRegistration,
  viewOSReport: trackViewOSReport,
  pwaInstall: trackPWAInstall,
};

export default pixel;
