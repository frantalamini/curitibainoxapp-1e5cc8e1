import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { OSReport } from '@/components/pdf/OSReport';
import { ServiceCall } from '@/hooks/useServiceCalls';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';

interface GenerateOSPdfResult {
  blob: Blob;
  fileName: string;
  blobUrl: string;
  osNumber: number;
}

interface GenerateOSPdfOptions {
  includeFinancial?: boolean;
}

type Report = {
  company: {
    name: string;
    cnpj?: string;
    ie?: string;
    phone?: string;
    email?: string;
    site?: string;
    address?: string;
    logoDataUrl?: string;
  };
  os: {
    number: number | string;
    scheduledDate?: string;
    scheduledTime?: string;
    technicianName?: string;
    technicalStatus?: string;
    conclusionDate?: string;
  };
  client: {
    name: string;
    phone?: string;
    email?: string;
    cnpj?: string;
    ie?: string;
    address?: string;
  };
  general: {
    equipment?: string;
    serialNumber?: string;
    purchaseOrderNumber?: string;
    problemDescription?: string;
    serviceType?: string;
    checklistTitle?: string | null;
    notes?: string | null;
    schedule?: {
      date?: string;
      time?: string;
      startedAt?: string;
    };
    technician?: { name: string };
  };
  technical: {
    analysisAndActions?: string | null;
    extraFields?: { label: string; value: string }[];
  };
  photos: {
    before: { images: string[]; videos?: string[] };
    after: { images: string[]; videos?: string[] };
  };
  checklist?: {
    title: string;
    filledBy?: string;
    filledAt?: string;
    sections: {
      title: string;
      items: {
        label: string;
        status: "OK" | "NC" | "NA" | "Pendente";
        note?: string | null;
        photos?: string[];
      }[];
    }[];
  } | null;
  signatures: {
    tech?: { name: string; when?: string; imageDataUrl?: string } | null;
    client?: { name: string; role?: string; when?: string; imageDataUrl?: string } | null;
  };
  financial?: {
    items: {
      type: 'PRODUCT' | 'SERVICE' | 'FEE' | 'DISCOUNT';
      description: string;
      qty: number;
      unitPrice: number;
      discountType: string | null;
      discountValue: number;
      total: number;
    }[];
    subtotals: {
      products: number;
      services: number;
      fees: number;
      discounts: number;
    };
    osDiscounts: {
      partsType: string | null;
      partsValue: number;
      servicesType: string | null;
      servicesValue: number;
      totalType: string | null;
      totalValue: number;
    };
    grandTotal: number;
    installments: {
      number: number;
      dueDate: string;
      amount: number;
      paymentMethod: string | null;
      notes: string | null;
      status: string;
    }[];
  } | null;
  _imageDiagnostics?: {
    mediaFailed?: string[];
    beforeFailed?: string[];
    afterFailed?: string[];
    totalAttempted: number;
    totalConverted: number;
    totalFailed: number;
  };
};

// Aguarda um tempo especificado (útil para debounce pós-upload)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Converte URL para Data URL com retry, timeout e método robusto (FileReader)
 */
async function toDataUrlWithRetry(
  url: string, 
  maxRetries = 2, 
  timeoutMs = 8000
): Promise<string | null> {
  // Se já é DataURL, retorna direto
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Validação básica
  if (!url.startsWith('http')) {
    console.warn('⚠️ [toDataUrl] URL inválida:', url.substring(0, 100));
    return null;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      console.log(`🔄 [toDataUrl] Tentativa ${attempt + 1}/${maxRetries + 1}:`, url.substring(0, 80) + '...');
      
      // Fetch com timeout
      const response = await fetch(url, { 
        signal: controller.signal,
        credentials: 'omit' // Evita CORS issues
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Converte para blob e depois para Data URL usando FileReader (método mais robusto)
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('FileReader falhou'));
        reader.readAsDataURL(blob);
      });
      
      console.log('✅ [toDataUrl] Conversão bem-sucedida:', blob.type);
      return dataUrl;
      
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError';
      const isLastAttempt = attempt === maxRetries;
      
      console.warn(
        `⚠️ [toDataUrl] Tentativa ${attempt + 1} falhou${isTimeout ? ' (timeout)' : ''}:`,
        error.message
      );
      
      // Se não for a última tentativa, aguarda antes de tentar novamente
      if (!isLastAttempt) {
        await sleep(400); // Backoff de 400ms
      } else {
        console.error('❌ [toDataUrl] TODAS as tentativas falharam:', url.substring(0, 80));
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Separa URLs em imagens e vídeos por extensão
 */
function splitMedia(urls: string[]): { images: string[]; videos: string[] } {
  const images: string[] = [];
  const videos: string[] = [];
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
  const videoExts = ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'];
  
  for (const url of urls) {
    const lower = url.toLowerCase();
    const isImage = imageExts.some(ext => lower.includes(ext));
    const isVideo = videoExts.some(ext => lower.includes(ext));
    
    if (isVideo) {
      videos.push(url);
    } else if (isImage) {
      images.push(url);
    }
  }
  
  return { images, videos };
}

/**
 * Busca a assinatura mais recente de um role específico
 */
function getLatestSignature(
  signatures: any[] | undefined, 
  role: 'tech' | 'client'
): { image_url: string; storage_path?: string; signed_at: string; signed_by?: string; position?: string } | null {
  if (!signatures || !Array.isArray(signatures)) return null;
  
  const filtered = signatures.filter((s: any) => s.role === role);
  if (filtered.length === 0) return null;
  
  return filtered.sort((a: any, b: any) => 
    new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime()
  )[0];
}

/**
 * Gera signed URL a partir de um caminho de storage ou URL existente
 * Suporta: caminhos relativos (novo), signed URLs (legacy), e data URLs
 */
async function resolveSignatureUrl(
  imageUrlOrPath: string | undefined | null
): Promise<string | null> {
  if (!imageUrlOrPath) return null;
  
  // Se já é data URL, retorna direto
  if (imageUrlOrPath.startsWith('data:')) {
    return imageUrlOrPath;
  }
  
  // Se é URL completa (https://...), pode ser signed URL antiga - tentar usar direto
  if (imageUrlOrPath.startsWith('http')) {
    // Tentar converter para data URL (pode falhar se expirada)
    const dataUrl = await toDataUrlWithRetry(imageUrlOrPath, 1, 5000);
    if (dataUrl) return dataUrl;
    
    // Se falhou e parece ser URL do Supabase storage, extrair o path e gerar nova signed URL
    if (imageUrlOrPath.includes('/storage/v1/object/')) {
      try {
        // Extrair path do storage da URL
        const match = imageUrlOrPath.match(/\/service-call-attachments\/([^?]+)/);
        if (match) {
          const storagePath = match[1];
          console.log('🔄 [PDF] Regenerando signed URL para path:', storagePath);
          
          const { data: signedData, error } = await supabase.storage
            .from('service-call-attachments')
            .createSignedUrl(storagePath, 3600); // 1 hora
          
          if (!error && signedData?.signedUrl) {
            return toDataUrlWithRetry(signedData.signedUrl, 2, 8000);
          }
        }
      } catch (err) {
        console.warn('⚠️ [PDF] Falha ao regenerar signed URL:', err);
      }
    }
    
    return null;
  }
  
  // É um caminho relativo no storage (novo formato)
  console.log('🔄 [PDF] Gerando signed URL para path:', imageUrlOrPath);
  
  try {
    const { data: signedData, error } = await supabase.storage
      .from('service-call-attachments')
      .createSignedUrl(imageUrlOrPath, 3600); // 1 hora
    
    if (error) {
      console.error('❌ [PDF] Erro ao gerar signed URL:', error);
      return null;
    }
    
    if (!signedData?.signedUrl) return null;
    
    // Converter para data URL
    return toDataUrlWithRetry(signedData.signedUrl, 2, 8000);
  } catch (err) {
    console.error('❌ [PDF] Falha ao resolver assinatura:', err);
    return null;
  }
}

/**
 * Aguarda propagação de uploads recentes no storage/CDN
 */
async function waitForStoragePropagation(delayMs = 300): Promise<void> {
  console.log(`⏳ [PDF] Aguardando ${delayMs}ms para propagação de uploads...`);
  await sleep(delayMs);
}

/**
 * Busca dados financeiros da OS (itens + transações/parcelas)
 */
async function fetchFinancialData(osId: string, osData: any): Promise<Report['financial'] | null> {
  try {
    // Buscar itens da OS
    const { data: items, error: itemsError } = await supabase
      .from('service_call_items')
      .select('*')
      .eq('service_call_id', osId)
      .order('created_at');

    if (itemsError) {
      console.error('❌ [PDF] Erro ao buscar itens financeiros:', itemsError);
      return null;
    }

    // Buscar transações/parcelas
    const { data: transactions, error: transError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('service_call_id', osId)
      .eq('direction', 'RECEIVE')
      .order('due_date')
      .order('installment_number');

    if (transError) {
      console.error('❌ [PDF] Erro ao buscar transações:', transError);
    }

    // Calcular subtotais
    const productItems = items?.filter(i => i.type === 'PRODUCT') || [];
    const serviceItems = items?.filter(i => i.type === 'SERVICE') || [];
    const feeItems = items?.filter(i => i.type === 'FEE') || [];
    const discountItems = items?.filter(i => i.type === 'DISCOUNT') || [];

    const totalProducts = productItems.reduce((sum, i) => sum + (i.total || 0), 0);
    const totalServices = serviceItems.reduce((sum, i) => sum + (i.total || 0), 0);
    const totalFees = feeItems.reduce((sum, i) => sum + (i.total || 0), 0);
    const totalDiscounts = discountItems.reduce((sum, i) => sum + (i.total || 0), 0);

    // Calcular descontos da OS
    const partsDiscountValue = osData.discount_parts_value || 0;
    const servicesDiscountValue = osData.discount_services_value || 0;
    const totalDiscountValue = osData.discount_total_value || 0;

    let partsDiscount = 0;
    if (osData.discount_parts_type === 'percentage') {
      partsDiscount = totalProducts * (partsDiscountValue / 100);
    } else {
      partsDiscount = partsDiscountValue;
    }

    let servicesDiscount = 0;
    if (osData.discount_services_type === 'percentage') {
      servicesDiscount = totalServices * (servicesDiscountValue / 100);
    } else {
      servicesDiscount = servicesDiscountValue;
    }

    const subtotalAfterGroupDiscounts = totalProducts + totalServices - partsDiscount - servicesDiscount;

    let generalDiscount = 0;
    if (osData.discount_total_type === 'percentage') {
      generalDiscount = subtotalAfterGroupDiscounts * (totalDiscountValue / 100);
    } else {
      generalDiscount = totalDiscountValue;
    }

    const grandTotal = subtotalAfterGroupDiscounts + totalFees - totalDiscounts - generalDiscount;

    // Mapear itens
    const mappedItems = (items || []).map(item => ({
      type: item.type as 'PRODUCT' | 'SERVICE' | 'FEE' | 'DISCOUNT',
      description: item.description,
      qty: item.qty || 1,
      unitPrice: item.unit_price || 0,
      discountType: item.discount_type,
      discountValue: item.discount_value || 0,
      total: item.total || 0,
    }));

    // Mapear parcelas
    const installments = (transactions || [])
      .filter(t => t.status !== 'CANCELED')
      .map(t => ({
        number: t.installment_number || 1,
        dueDate: format(parseLocalDate(t.due_date), 'dd/MM/yyyy', { locale: ptBR }),
        amount: t.amount || 0,
        paymentMethod: t.payment_method,
        notes: t.notes || null,
        status: t.status || 'OPEN',
      }));

    return {
      items: mappedItems,
      subtotals: {
        products: totalProducts,
        services: totalServices,
        fees: totalFees,
        discounts: totalDiscounts,
      },
      osDiscounts: {
        partsType: osData.discount_parts_type,
        partsValue: partsDiscountValue,
        servicesType: osData.discount_services_type,
        servicesValue: servicesDiscountValue,
        totalType: osData.discount_total_type,
        totalValue: totalDiscountValue,
      },
      grandTotal: grandTotal > 0 ? grandTotal : 0,
      installments,
    };
  } catch (error) {
    console.error('❌ [PDF] Erro geral ao buscar dados financeiros:', error);
    return null;
  }
}

/**
 * Gera PDF da OS usando @react-pdf/renderer
 * @param osId - ID da OS no Supabase
 * @param options - Opções de geração (includeFinancial para relatório completo)
 * @returns Blob, fileName, blobUrl e osNumber
 */
export const generateOSPdf = async (
  osId: string, 
  options: GenerateOSPdfOptions = {}
): Promise<GenerateOSPdfResult> => {
  const { includeFinancial = false } = options;

  // 0. AGUARDAR PROPAGAÇÃO DE UPLOADS RECENTES
  await waitForStoragePropagation(300);
  
  // 1. BUSCAR DADOS DA OS
  const { data: osData, error: osError } = await supabase
    .from('service_calls')
    .select(`
      *,
      clients (
        full_name,
        cpf_cnpj,
        state_registration,
        address,
        city,
        state,
        cep,
        phone,
        email
      ),
      technicians (
        full_name,
        phone
      ),
      service_types (
        name,
        color
      ),
      status:service_call_statuses!service_calls_status_id_fkey (
        name
      )
    `)
    .eq('id', osId)
    .single();

  if (osError || !osData) {
    throw new Error('OS não encontrada');
  }

  const call = osData as ServiceCall;
  const clientData = call.clients as any;

  // 2. BUSCAR DADOS DA EMPRESA
  const { data: companyData } = await supabase
    .from('system_settings')
    .select('*')
    .single();

  const companyDataAny = companyData as any;

  // Converter logo para DataURL
  const logoUrl = companyDataAny?.report_logo || companyData?.logo_url || null;
  const logoDataUrl = await toDataUrlWithRetry(logoUrl || '');

  // 3. BUSCAR CHECKLIST (se houver)
  let checklist: Report['checklist'] = null;
  if (call.checklist_id && call.checklist_responses) {
    const { data: checklistData } = await supabase
      .from('checklists')
      .select('name, items')
      .eq('id', call.checklist_id)
      .single();

    if (checklistData) {
      const responses = call.checklist_responses as Record<string, boolean>;
      checklist = {
        title: checklistData.name,
        filledBy: call.technicians?.full_name || undefined,
        filledAt: call.updated_at 
          ? format(new Date(call.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
          : undefined,
        sections: [{
          title: "Itens do Checklist",
          items: (checklistData.items as Array<{ id: string; text: string }>).map((item) => ({
            label: item.text,
            status: responses[item.id] ? "OK" : "Pendente",
            note: null,
            photos: []
          }))
        }]
      };
    }
  }

  // 4. SEPARAR IMAGENS E VÍDEOS DE "ANTES" E "DEPOIS"
  const beforeSplit = splitMedia(call.photos_before_urls || []);
  const afterSplit = splitMedia(call.photos_after_urls || []);

  console.log('🔍 [PDF] Separação de mídias técnicas:', {
    before: { images: beforeSplit.images.length, videos: beforeSplit.videos.length },
    after: { images: afterSplit.images.length, videos: afterSplit.videos.length },
  });

  // Converter apenas IMAGENS para DataURL (com retry)
  const beforePhotos: string[] = [];
  const beforeFailed: string[] = [];
  for (const url of beforeSplit.images) {
    const dataUrl = await toDataUrlWithRetry(url);
    if (dataUrl) {
      beforePhotos.push(dataUrl);
    } else {
      console.error('❌ [PDF] FALHA CRÍTICA ao converter foto "antes":', url);
      beforeFailed.push(url);
    }
  }

  const afterPhotos: string[] = [];
  const afterFailed: string[] = [];
  for (const url of afterSplit.images) {
    const dataUrl = await toDataUrlWithRetry(url);
    if (dataUrl) {
      afterPhotos.push(dataUrl);
    } else {
      console.error('❌ [PDF] FALHA CRÍTICA ao converter foto "depois":', url);
      afterFailed.push(url);
    }
  }

  console.log('🔍 [PDF] Fotos convertidas:', {
    before: beforePhotos.length,
    after: afterPhotos.length,
  });

  // 5. PROCESSAR ASSINATURAS (novo formato com histórico + resolução robusta de URLs)
  const latestTechSignature = getLatestSignature((call as any).signatures, 'tech');
  const latestClientSignature = getLatestSignature((call as any).signatures, 'client');

  let techSignatureDataUrl: string | null = null;
  let clientSignatureDataUrl: string | null = null;

  // Técnico: usar nova função que resolve paths e regenera signed URLs se necessário
  if (latestTechSignature?.storage_path) {
    techSignatureDataUrl = await resolveSignatureUrl(latestTechSignature.storage_path);
  } else if (latestTechSignature?.image_url) {
    techSignatureDataUrl = await resolveSignatureUrl(latestTechSignature.image_url);
  } else if (call.technician_signature_data) {
    techSignatureDataUrl = await resolveSignatureUrl(call.technician_signature_data);
  } else if (call.technician_signature_url) {
    techSignatureDataUrl = await resolveSignatureUrl(call.technician_signature_url);
  }

  // Cliente: usar nova função que resolve paths e regenera signed URLs se necessário
  if (latestClientSignature?.storage_path) {
    clientSignatureDataUrl = await resolveSignatureUrl(latestClientSignature.storage_path);
  } else if (latestClientSignature?.image_url) {
    clientSignatureDataUrl = await resolveSignatureUrl(latestClientSignature.image_url);
  } else if (call.customer_signature_data) {
    clientSignatureDataUrl = await resolveSignatureUrl(call.customer_signature_data);
  } else if (call.customer_signature_url) {
    clientSignatureDataUrl = await resolveSignatureUrl(call.customer_signature_url);
  }

  console.log('🔍 [PDF] Assinaturas processadas:', {
    techFromHistory: !!latestTechSignature,
    clientFromHistory: !!latestClientSignature,
    techResolved: !!techSignatureDataUrl,
    clientResolved: !!clientSignatureDataUrl,
    techFallback: !latestTechSignature && !!(call.technician_signature_data || call.technician_signature_url),
    clientFallback: !latestClientSignature && !!(call.customer_signature_data || call.customer_signature_url),
  });

  // 6. SEPARAR IMAGENS E VÍDEOS DE "FOTOS E VÍDEOS" (media_urls)
  const mediaSplit = splitMedia(call.media_urls || []);

  console.log('🔍 [PDF] Separação de "Fotos e Vídeos":', {
    images: mediaSplit.images.length,
    videos: mediaSplit.videos.length,
  });

  // Converter apenas IMAGENS para DataURL (com retry)
  const mediaPhotos: string[] = [];
  const mediaFailed: string[] = [];
  for (const url of mediaSplit.images) {
    const dataUrl = await toDataUrlWithRetry(url);
    if (dataUrl) {
      mediaPhotos.push(dataUrl);
    } else {
      console.error('❌ [PDF] FALHA CRÍTICA ao converter foto de media_urls:', url);
      mediaFailed.push(url);
    }
  }

  console.log('🔍 [PDF] Fotos de "Fotos e Vídeos" convertidas:', mediaPhotos.length);

  // 7. BUSCAR DADOS FINANCEIROS (se solicitado)
  let financialData: Report['financial'] = null;
  if (includeFinancial) {
    console.log('💰 [PDF] Buscando dados financeiros...');
    financialData = await fetchFinancialData(osId, osData);
    console.log('💰 [PDF] Dados financeiros:', financialData ? 'OK' : 'Nenhum');
  }

  // 8. MONTAR ENDEREÇO COMPLETO DA EMPRESA
  const companyAddressParts = [
    companyDataAny?.company_address,
  ].filter(Boolean);
  const companyAddress = companyAddressParts.length > 0 ? companyAddressParts.join(', ') : undefined;

  // 9. MONTAR ENDEREÇO COMPLETO DO CLIENTE
  const clientAddressParts = [
    clientData?.address,
    clientData?.city && clientData?.state ? `${clientData.city}/${clientData.state}` : clientData?.city || clientData?.state,
    clientData?.cep ? `CEP: ${clientData.cep}` : null,
  ].filter(Boolean);
  const clientAddress = clientAddressParts.length > 0 ? clientAddressParts.join(', ') : undefined;

  // 10. PREPARAR DADOS PARA O PDF
  const report: Report = {
    company: {
      name: companyData?.company_name || 'Curitiba Inox',
      cnpj: companyDataAny?.company_cnpj?.trim() || undefined,
      ie: companyDataAny?.company_ie?.trim() || undefined,
      phone: companyDataAny?.company_phone?.trim() || undefined,
      email: companyDataAny?.company_email?.trim() || undefined,
      site: companyDataAny?.company_website?.trim() || undefined,
      address: companyAddress,
      logoDataUrl: logoDataUrl || undefined,
    },
    os: {
      number: call.os_number,
      scheduledDate: format(new Date(call.scheduled_date), 'dd/MM/yyyy', { locale: ptBR }),
      scheduledTime: call.scheduled_time || undefined,
      technicianName: call.technicians?.full_name || undefined,
      technicalStatus: (call as any).status?.name || undefined,
      conclusionDate: call.updated_at
        ? format(new Date(call.updated_at), 'dd/MM/yyyy', { locale: ptBR })
        : undefined,
    },
    client: {
      name: clientData?.full_name || 'Cliente não identificado',
      phone: clientData?.phone?.trim() || undefined,
      email: clientData?.email?.trim() || undefined,
      cnpj: clientData?.cpf_cnpj?.trim() || undefined,
      ie: clientData?.state_registration?.trim() || undefined,
      address: clientAddress,
    },
    general: {
      equipment: call.equipment_description?.trim() || undefined,
      serialNumber: call.equipment_serial_number?.trim() || undefined,
      purchaseOrderNumber: (call as any).purchase_order_number?.trim() || undefined,
      problemDescription: call.problem_description?.trim() || undefined,
      serviceType: call.service_types?.name?.trim() || undefined,
      checklistTitle: checklist?.title || null,
      notes: call.notes?.trim() || null,
      schedule: {
        date: format(new Date(call.scheduled_date), 'dd/MM/yyyy', { locale: ptBR }),
        time: call.scheduled_time || undefined,
        startedAt: call.started_at
          ? format(new Date(call.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
          : undefined,
      },
      technician: call.technicians?.full_name 
        ? { name: call.technicians.full_name }
        : undefined,
    },
    technical: {
      analysisAndActions: call.technical_diagnosis?.trim() || null,
      extraFields: [],
    },
    photos: {
      before: {
        images: [...mediaPhotos, ...beforePhotos],
        videos: (() => {
          const allBeforeVideos = [
            ...mediaSplit.videos,
            ...beforeSplit.videos,
            call.video_before_url || null,
          ].filter(Boolean) as string[];
          return allBeforeVideos.length > 0 ? allBeforeVideos : undefined;
        })(),
      },
      after: {
        images: afterPhotos,
        videos: (() => {
          const allAfterVideos = [
            ...afterSplit.videos,
            call.video_after_url || null,
          ].filter(Boolean) as string[];
          return allAfterVideos.length > 0 ? allAfterVideos : undefined;
        })(),
      },
    },
    _imageDiagnostics: {
      mediaFailed: mediaFailed.length > 0 ? mediaFailed : undefined,
      beforeFailed: beforeFailed.length > 0 ? beforeFailed : undefined,
      afterFailed: afterFailed.length > 0 ? afterFailed : undefined,
      totalAttempted: beforeSplit.images.length + afterSplit.images.length + mediaSplit.images.length,
      totalConverted: mediaPhotos.length + beforePhotos.length + afterPhotos.length,
      totalFailed: mediaFailed.length + beforeFailed.length + afterFailed.length,
    },
    checklist,
    signatures: {
      tech: techSignatureDataUrl
        ? {
            name: latestTechSignature?.signed_by || call.technicians?.full_name || 'Técnico',
            when: latestTechSignature?.signed_at
              ? format(new Date(latestTechSignature.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : call.technician_signature_date
              ? format(new Date(call.technician_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : undefined,
            imageDataUrl: techSignatureDataUrl,
          }
        : null,
      client: clientSignatureDataUrl
        ? {
            name: latestClientSignature?.signed_by || call.customer_name || 'Cliente',
            role: latestClientSignature?.position?.trim() || call.customer_position?.trim() || undefined,
            when: latestClientSignature?.signed_at
              ? format(new Date(latestClientSignature.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : call.customer_signature_date
              ? format(new Date(call.customer_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : undefined,
            imageDataUrl: clientSignatureDataUrl,
          }
        : null,
    },
    financial: financialData,
  };

  // 11. RENDERIZAR PDF
  const doc = <OSReport data={report} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();

  // 12. GERAR NOME DO ARQUIVO
  const suffix = includeFinancial ? '-completo' : '';
  const fileName = `relatorio-os-${call.os_number}${suffix}.pdf`;

  // 13. CRIAR BLOB URL
  const blobUrl = URL.createObjectURL(blob);

  // LOG DE DIAGNÓSTICO
  const diag = report._imageDiagnostics;
  if (diag && diag.totalFailed > 0) {
    console.error('🚨 [PDF] IMAGENS FALHARAM:', {
      tentadas: diag.totalAttempted,
      convertidas: diag.totalConverted,
      falhadas: diag.totalFailed,
      detalhes: {
        media: diag.mediaFailed,
        antes: diag.beforeFailed,
        depois: diag.afterFailed,
      }
    });
  } else {
    console.log('✅ [PDF] TODAS as imagens convertidas com sucesso:', {
      total: diag?.totalConverted || 0,
    });
  }

  return {
    blob,
    fileName,
    blobUrl,
    osNumber: call.os_number,
  };
};

/**
 * Marca a OS como tendo relatório financeiro gerado
 * Isso bloqueia técnicos de acessar/baixar relatórios dessa OS
 */
export const markOSWithFinancialReport = async (osId: string): Promise<void> => {
  const { error } = await supabase
    .from('service_calls')
    .update({ has_financial_report: true })
    .eq('id', osId);

  if (error) {
    console.error('❌ [PDF] Erro ao marcar OS com relatório financeiro:', error);
    throw error;
  }

  console.log('✅ [PDF] OS marcada com relatório financeiro');
};
