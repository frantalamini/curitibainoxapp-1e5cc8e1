import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/logo.png";

/**
 * Carrega a logo do sistema (personalizada ou padrão) em Base64 para uso em PDFs
 */
export const loadSystemLogoForPdf = async (): Promise<string> => {
  try {
    // Buscar configuração da logo personalizada
    const { data: settings } = await supabase
      .from("system_settings")
      .select("logo_url")
      .single();

    const logoUrl = settings?.logo_url || defaultLogo;

    // Se for URL do Supabase Storage, baixar via SDK
    if (logoUrl.includes('supabase.co/storage')) {
      const urlParts = logoUrl.split('/storage/v1/object/');
      if (urlParts.length >= 2) {
        const fullPath = urlParts[1];
        const pathParts = fullPath.split('/');
        const bucketName = pathParts[1];
        const filePath = pathParts.slice(2).join('/');

        const { data, error } = await supabase.storage
          .from(bucketName)
          .download(filePath);

        if (!error && data) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(defaultLogo);
            reader.readAsDataURL(data);
          });
        }
      }
    }

    // Se for logo padrão (import local) ou URL externa
    if (logoUrl.startsWith('data:') || logoUrl.startsWith('blob:')) {
      return logoUrl;
    }

    // Fallback: tentar fetch direto
    const response = await fetch(logoUrl);
    if (!response.ok) {
      return defaultLogo;
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(defaultLogo);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erro ao carregar logo para PDF:", error);
    return defaultLogo;
  }
};

/**
 * Adiciona logo no cabeçalho do PDF (padrão: canto superior esquerdo)
 */
export const addLogoToPdf = (
  pdf: any,
  logoBase64: string,
  options?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
  }
) => {
  const {
    x = 20,
    y = 10,
    width = 30,
    height = 15,
    align = 'left',
  } = options || {};

  const pageWidth = pdf.internal.pageSize.getWidth();
  let finalX = x;

  if (align === 'center') {
    finalX = (pageWidth - width) / 2;
  } else if (align === 'right') {
    finalX = pageWidth - width - x;
  }

  try {
    pdf.addImage(logoBase64, 'PNG', finalX, y, width, height);
  } catch (error) {
    console.error("Erro ao adicionar logo ao PDF:", error);
  }
};
