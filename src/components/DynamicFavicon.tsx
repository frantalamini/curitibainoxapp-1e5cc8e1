import { useEffect } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const DynamicFavicon = () => {
  const { settings } = useSystemSettings();

  useEffect(() => {
    if (!settings?.logo_url) return;

    // Atualiza todos os links de favicon
    const updateFavicon = (selector: string, url: string) => {
      const link = document.querySelector(selector) as HTMLLinkElement;
      if (link) {
        link.href = url;
      }
    };

    // Atualiza favicon padrão
    updateFavicon('link[rel="icon"][sizes="32x32"]', settings.logo_url);
    updateFavicon('link[rel="icon"][sizes="16x16"]', settings.logo_url);
    
    // Atualiza Apple Touch Icons
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((link) => {
      (link as HTMLLinkElement).href = settings.logo_url!;
    });

  }, [settings?.logo_url]);

  return null;
};

export default DynamicFavicon;
