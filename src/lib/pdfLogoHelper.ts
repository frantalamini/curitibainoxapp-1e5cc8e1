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
 * Adiciona logo no cabeçalho do PDF preservando aspect ratio
 */
export const addLogoToPdf = (
  pdf: any,
  logoBase64: string,
  options?: {
    x?: number;
    y?: number;
    maxWidth?: number;
    maxHeight?: number;
    align?: 'left' | 'center' | 'right';
  }
) => {
  const {
    x = 14,
    y = 14,
    maxWidth = 48,
    maxHeight = 16,
    align = 'left',
  } = options || {};

  const pageWidth = pdf.internal.pageSize.getWidth();

  try {
    // Detectar dimensões reais da imagem usando getImageProperties
    const imgProps = pdf.getImageProperties(logoBase64);
    const aspectRatio = imgProps.width / imgProps.height;
    
    // Calcular dimensões mantendo proporção
    let finalWidth = maxWidth;
    let finalHeight = maxWidth / aspectRatio;
    
    // Se altura exceder limite, recalcular baseado na altura
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = maxHeight * aspectRatio;
    }
    
    // Ajustar X para alinhamento
    let finalX = x;
    if (align === 'center') {
      finalX = (pageWidth - finalWidth) / 2;
    } else if (align === 'right') {
      finalX = pageWidth - finalWidth - x;
    }
    
    pdf.addImage(logoBase64, 'PNG', finalX, y, finalWidth, finalHeight);
  } catch (error) {
    console.error("Erro ao adicionar logo ao PDF:", error);
    // Fallback: usar dimensões máximas sem aspect ratio
    let finalX = x;
    if (align === 'center') {
      finalX = (pageWidth - maxWidth) / 2;
    } else if (align === 'right') {
      finalX = pageWidth - maxWidth - x;
    }
    pdf.addImage(logoBase64, 'PNG', finalX, y, maxWidth, maxHeight);
  }
};
