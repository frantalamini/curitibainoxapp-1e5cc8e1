/**
 * PixelPageTracker
 * Dispara PageView + eventos customizados a cada mudança de rota.
 * Deve ser renderizado DENTRO do <BrowserRouter> no App.tsx.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  trackPageView,
  trackContact,
  trackViewOSReport,
  trackPWAInstall,
  trackViewFinanceiro,
} from "@/lib/pixel";

// Mapa de rotas para eventos customizados por página
const ROUTE_EVENTS: Array<{
  pattern: RegExp;
  fire: (pathname: string) => void;
}> = [
  // Tela de login → Contact
  {
    pattern: /^\/auth$/,
    fire: () => trackContact(),
  },
  // Relatório público de OS → ViewOSReport
  {
    pattern: /^\/relatorio-os\/(.+?)\//,
    fire: (pathname) => {
      const match = pathname.match(/^\/relatorio-os\/(.+?)\//);
      if (match) trackViewOSReport(match[1]);
    },
  },
  // Tela de instalação PWA
  {
    pattern: /^\/install$/,
    fire: () => trackPWAInstall(),
  },
  // Dashboard financeiro e sub-rotas
  {
    pattern: /^\/financas/,
    fire: () => trackViewFinanceiro(),
  },
];

export function PixelPageTracker() {
  const location = useLocation();

  useEffect(() => {
    // 1. PageView em toda mudança de rota
    trackPageView();

    // 2. Evento customizado conforme a rota
    for (const route of ROUTE_EVENTS) {
      if (route.pattern.test(location.pathname)) {
        route.fire(location.pathname);
        break;
      }
    }
  }, [location.pathname]);

  return null;
}

export default PixelPageTracker;
