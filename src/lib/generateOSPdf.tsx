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

  // 2. BUSCAR DADOS DA EMPRESA
  const { data: companyData } = await supabase
    .from('system_settings')
    .select('*')
    .single();

  const companyDataAny = companyData as any;

  const company = {
    name: companyData?.company_name || 'Curitiba Inox',
    cnpj: companyDataAny?.company_cnpj || '',
    ie: companyDataAny?.company_ie || '',
    address: companyDataAny?.company_address || '',
    website: companyDataAny?.company_website || '',
    email: companyDataAny?.company_email || '',
    phone: companyDataAny?.company_phone || '',
    logoUrl: companyDataAny?.report_logo || companyData?.logo_url || '',
  };

  // 3. BUSCAR CHECKLIST (se houver)
  let checklistItems: Array<{ id: string; text: string }> = [];
  if (call.checklist_id && call.checklist_responses) {
    const { data: checklistData } = await supabase
      .from('checklists')
      .select('items')
      .eq('id', call.checklist_id)
      .single();

    if (checklistData?.items) {
      checklistItems = checklistData.items as Array<{ id: string; text: string }>;
    }
  }

  // 4. PREPARAR DADOS PARA O PDF
  const clientData = call.clients as any;
  
  const pdfData = {
    osNumber: call.os_number,
    company,
    client: {
      name: clientData?.full_name || 'N/A',
      cpfCnpj: clientData?.cpf_cnpj || '',
      ie: clientData?.state_registration || '',
      address: clientData?.address || '',
      city: clientData?.city || '',
      state: clientData?.state || '',
      cep: clientData?.cep || '',
      phone: clientData?.phone || '',
      email: clientData?.email || '',
    },
    os: {
      number: call.os_number,
      createdAt: format(new Date(call.created_at), 'dd/MM/yyyy', { locale: ptBR }),
      status: call.status,
      scheduledDate: format(new Date(call.scheduled_date), 'dd/MM/yyyy', { locale: ptBR }),
      finishedAt:
        call.status === 'completed' && call.updated_at
          ? format(new Date(call.updated_at), 'dd/MM/yyyy', { locale: ptBR })
          : '',
    },
    technician: {
      name: call.technicians?.full_name || 'N/A',
      phone: call.technicians?.phone || '',
    },
    scheduling: {
      date: format(new Date(call.scheduled_date), 'dd/MM/yyyy', { locale: ptBR }),
      time: call.scheduled_time || '',
      startedAt: call.started_at
        ? format(new Date(call.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
        : '',
      serviceType: call.service_types?.name || '',
    },
    equipment: {
      description: call.equipment_description || '',
      serialNumber: call.equipment_serial_number || '',
    },
    problem: call.problem_description || '',
    servicesPerformed: call.technical_diagnosis || '',
    parts: 'N/A',
    notes: call.notes || '',
    checklist: {
      items: checklistItems,
      responses: call.checklist_responses || {},
    },
    photos: [
      ...(call.photos_before_urls || []),
      ...(call.photos_after_urls || []),
    ].filter((url) => url && url.startsWith('http')),
    signatures: {
      technician: {
        name: call.technicians?.full_name || '',
        url: call.technician_signature_url || call.technician_signature_data || '',
        date: call.technician_signature_date
          ? format(
              new Date(call.technician_signature_date),
              "dd/MM/yyyy 'às' HH:mm",
              { locale: ptBR }
            )
          : '',
      },
      customer: {
        name: call.customer_name || call.clients?.full_name || '',
        position: call.customer_position || '',
        url: call.customer_signature_url || call.customer_signature_data || '',
        date: call.customer_signature_date
          ? format(
              new Date(call.customer_signature_date),
              "dd/MM/yyyy 'às' HH:mm",
              { locale: ptBR }
            )
          : '',
      },
    },
  };

  // 5. RENDERIZAR PDF
  const doc = <OSReport data={pdfData} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();

  // 6. GERAR NOME DO ARQUIVO
  const fileName = `relatorio-os-${call.os_number}.pdf`;

  // 7. CRIAR BLOB URL
  const blobUrl = URL.createObjectURL(blob);

  return {
    blob,
    fileName,
    blobUrl,
    osNumber: call.os_number,
  };
};
