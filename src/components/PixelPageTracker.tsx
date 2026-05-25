/**
 * PixelPageTracker
 * Dispara pixel APENAS em rotas PÚBLICAS.
 * Rotas autenticadas/ERP NÃO enviam dados ao Facebook.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  trackPageView,
  trackContact,
  trackViewOSReport,
  trackPWAInstall,
} from "@/lib/pixel";

const PUBLIC_ROUTES = ["/auth", "/install", "/qr/", "/relatorio-os/"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

const ROUTE_EVENTS: Array<{
  pattern: RegExp;
  fire: () => void;
}> = [
  { pattern: /^\/auth$/, fire: () => trackContact() },
  { pattern: /^\/relatorio-os\//, fire: () => trackViewOSReport() },
  { pattern: /^\/install$/, fire: () => trackPWAInstall() },
];

export function PixelPageTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!isPublicRoute(location.pathname)) return;

    trackPageView();

    for (const route of ROUTE_EVENTS) {
      if (route.pattern.test(location.pathname)) {
        route.fire();
        break;
      }
    }
  }, [location.pathname]);

  return null;
}

export default PixelPageTracker;
