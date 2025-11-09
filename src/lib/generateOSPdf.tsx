import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { OSReport } from '@/components/pdf/OSReport';
import { ServiceCall } from '@/hooks/useServiceCalls';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GenerateOSPdfResult {
  blob: Blob;
  fileName: string;
  blobUrl: string;
  osNumber: number;
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
    issueDate?: string;
    status?: string;
    dueDate?: string;
    finishDate?: string;
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
};

async function toDataUrl(url: string | null): Promise<string | null> {
  if (!url) {
    console.warn('⚠️ [toDataUrl] URL vazia ou null');
    return null;
  }
  
  // Se já é DataURL, retorna direto
  if (url.startsWith('data:')) {
    console.log('✅ [toDataUrl] DataURL detectado, retornando direto');
    return url;
  }
  
  // Só aceitar URLs HTTP/HTTPS
  if (!url.startsWith('http')) {
    console.warn('⚠️ [toDataUrl] URL inválida (não HTTP):', url.substring(0, 100));
    return null;
  }
  
  try {
    console.log('🔄 [toDataUrl] Convertendo URL pública:', url.substring(0, 100) + '...');
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ [toDataUrl] Fetch falhou:', response.status, response.statusText);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );
    const contentType = response.headers.get('content-type') || 'image/png';
    
    console.log('✅ [toDataUrl] Conversão bem-sucedida:', contentType);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('❌ [toDataUrl] Erro na conversão:', error);
    return null;
  }
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
 * Gera PDF da OS usando @react-pdf/renderer
 * @param osId - ID da OS no Supabase
 * @returns Blob, fileName, blobUrl e osNumber
 */
export const generateOSPdf = async (osId: string): Promise<GenerateOSPdfResult> => {
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
  const logoDataUrl = await toDataUrl(logoUrl);

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

  // Converter apenas IMAGENS para DataURL
  const beforePhotos: string[] = [];
  for (const url of beforeSplit.images) {
    const dataUrl = await toDataUrl(url);
    if (dataUrl) {
      beforePhotos.push(dataUrl);
    } else {
      console.warn('⚠️ [PDF] Falha ao converter foto "antes":', url);
    }
  }

  const afterPhotos: string[] = [];
  for (const url of afterSplit.images) {
    const dataUrl = await toDataUrl(url);
    if (dataUrl) {
      afterPhotos.push(dataUrl);
    } else {
      console.warn('⚠️ [PDF] Falha ao converter foto "depois":', url);
    }
  }

  console.log('🔍 [PDF] Fotos convertidas:', {
    before: beforePhotos.length,
    after: afterPhotos.length,
  });

  // 5. CONVERTER ASSINATURAS PARA DATAURL
  // Priorizar signature_data (já é DataURL) e usar signature_url como fallback
  let techSignatureDataUrl: string | null = null;
  let clientSignatureDataUrl: string | null = null;

  // Técnico: tentar data primeiro (mais confiável), depois url
  if (call.technician_signature_data) {
    techSignatureDataUrl = await toDataUrl(call.technician_signature_data);
  }
  if (!techSignatureDataUrl && call.technician_signature_url) {
    techSignatureDataUrl = await toDataUrl(call.technician_signature_url);
  }

  // Cliente: tentar data primeiro (mais confiável), depois url
  if (call.customer_signature_data) {
    clientSignatureDataUrl = await toDataUrl(call.customer_signature_data);
  }
  if (!clientSignatureDataUrl && call.customer_signature_url) {
    clientSignatureDataUrl = await toDataUrl(call.customer_signature_url);
  }

  // Debug: verificar se as assinaturas foram processadas
  console.log('🔍 [PDF] Assinaturas processadas:', {
    techData: call.technician_signature_data?.substring(0, 50) + '...',
    techUrl: call.technician_signature_url,
    techDataUrl: techSignatureDataUrl?.substring(0, 50) + '...',
    clientData: call.customer_signature_data?.substring(0, 50) + '...',
    clientUrl: call.customer_signature_url,
    clientDataUrl: clientSignatureDataUrl?.substring(0, 50) + '...',
  });

  // 6. SEPARAR IMAGENS E VÍDEOS DE "FOTOS E VÍDEOS" (media_urls)
  const mediaSplit = splitMedia(call.media_urls || []);

  console.log('🔍 [PDF] Separação de "Fotos e Vídeos":', {
    images: mediaSplit.images.length,
    videos: mediaSplit.videos.length,
  });

  // Converter apenas IMAGENS para DataURL
  const mediaPhotos: string[] = [];
  for (const url of mediaSplit.images) {
    const dataUrl = await toDataUrl(url);
    if (dataUrl) {
      mediaPhotos.push(dataUrl);
    } else {
      console.warn('⚠️ [PDF] Falha ao converter foto de media_urls:', url);
    }
  }

  console.log('🔍 [PDF] Fotos de "Fotos e Vídeos" convertidas:', mediaPhotos.length);

  // 8. MONTAR ENDEREÇO COMPLETO DA EMPRESA
  const companyAddressParts = [
    companyDataAny?.company_address,
  ].filter(Boolean);
  const companyAddress = companyAddressParts.length > 0 ? companyAddressParts.join(', ') : undefined;

  // 7. MONTAR ENDEREÇO COMPLETO DO CLIENTE
  const clientAddressParts = [
    clientData?.address,
    clientData?.city && clientData?.state ? `${clientData.city}/${clientData.state}` : clientData?.city || clientData?.state,
    clientData?.cep ? `CEP: ${clientData.cep}` : null,
  ].filter(Boolean);
  const clientAddress = clientAddressParts.length > 0 ? clientAddressParts.join(', ') : undefined;

  // 8. PREPARAR DADOS PARA O PDF
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
      issueDate: format(new Date(call.created_at), 'dd/MM/yyyy', { locale: ptBR }),
      status: call.status,
      dueDate: format(new Date(call.scheduled_date), 'dd/MM/yyyy', { locale: ptBR }),
      finishDate: call.status === 'completed' && call.updated_at
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
    checklist,
    signatures: {
      tech: techSignatureDataUrl || call.technicians?.full_name
        ? {
            name: call.technicians?.full_name || 'Técnico',
            when: call.technician_signature_date
              ? format(new Date(call.technician_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : undefined,
            imageDataUrl: techSignatureDataUrl || undefined,
          }
        : null,
      client: clientSignatureDataUrl || call.customer_name || clientData?.full_name
        ? {
            name: call.customer_name || clientData?.full_name || 'Cliente',
            role: call.customer_position?.trim() || undefined,
            when: call.customer_signature_date
              ? format(new Date(call.customer_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : undefined,
            imageDataUrl: clientSignatureDataUrl || undefined,
          }
        : null,
    },
  };

  // 9. RENDERIZAR PDF
  const doc = <OSReport data={report} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();

  // 10. GERAR NOME DO ARQUIVO
  const fileName = `relatorio-os-${call.os_number}.pdf`;

  // 11. CRIAR BLOB URL
  const blobUrl = URL.createObjectURL(blob);

  return {
    blob,
    fileName,
    blobUrl,
    osNumber: call.os_number,
  };
};
