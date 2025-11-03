import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServiceCall {
  os_number: number;
  created_at: string;
  updated_at: string;
  scheduled_date: string;
  scheduled_time: string;
  started_at?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  equipment_description: string;
  equipment_serial_number?: string;
  problem_description?: string;
  technical_diagnosis?: string;
  technical_diagnosis_audio_url?: string;
  notes?: string;
  internal_notes_text?: string;
  photos_before_urls?: string[];
  photos_after_urls?: string[];
  checklist_id?: string;
  checklist_responses?: Record<string, boolean>;
  technician_signature_url?: string;
  technician_signature_data?: string;
  technician_signature_date?: string;
  customer_signature_url?: string;
  customer_signature_data?: string;
  customer_signature_date?: string;
  customer_name?: string;
  customer_position?: string;
  clients?: {
    full_name: string;
    phone: string;
    address?: string;
    cpf_cnpj?: string;
    state_registration?: string;
    email?: string;
    nome_fantasia?: string;
  };
  technicians?: {
    full_name: string;
  };
}

interface CompanyData {
  name: string;
  cnpj?: string;
  ie?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function getTemplateStyles(): string {
  return `
    @page {
      size: A4;
      margin: 25mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #111;
      line-height: 1.3;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    /* ===== CABEÇALHO ===== */
    .header {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 20px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .header__logo {
      width: auto;
      height: 40px;
      object-fit: contain;
    }

    .header__company {
      text-align: right;
      font-size: 9px;
      line-height: 1.4;
    }

    .header__company-name {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .title {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 12px 0;
      padding: 8px 0;
      border-top: 0.5pt solid #C9CED6;
      border-bottom: 0.5pt solid #C9CED6;
    }

    /* ===== LAYOUT 2 COLUNAS ===== */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 0.6fr;
      gap: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    /* ===== SEÇÕES ===== */
    .section {
      margin-bottom: 8px;
      page-break-inside: avoid;
    }

    .section__title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 0.5pt solid #C9CED6;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }

    .section__content {
      padding: 6px;
      border: 0.5pt solid #C9CED6;
      border-radius: 4px;
      line-height: 1.4;
    }

    .section__content p {
      margin-bottom: 3px;
    }

    .section__content p:last-child {
      margin-bottom: 0;
    }

    /* ===== TABELA DADOS OS ===== */
    .os-table {
      border: 0.5pt solid #C9CED6;
      border-radius: 4px;
      overflow: hidden;
    }

    .os-table__row {
      display: flex;
      justify-content: space-between;
      border-bottom: 0.5pt solid #C9CED6;
      padding: 4px 6px;
    }

    .os-table__row:last-child {
      border-bottom: none;
    }

    .os-table__label {
      font-weight: bold;
      font-size: 9px;
    }

    .os-table__value {
      font-size: 9px;
      text-align: right;
      flex: 1;
      padding-left: 8px;
    }

    /* ===== GRID 2 COLUNAS PARA EQUIPAMENTO ===== */
    .grid-two {
      display: grid;
      grid-template-columns: 1fr 0.5fr;
      gap: 8px;
    }

    /* ===== CHECKLIST ===== */
    .checklist {
      margin-top: 8px;
    }

    .checklist__item {
      display: flex;
      justify-content: space-between;
      border-bottom: 0.5pt solid #C9CED6;
      padding: 4px 6px;
      page-break-inside: avoid;
    }

    .checklist__item:last-child {
      border-bottom: none;
    }

    .checklist__question {
      flex: 1;
      padding-right: 12px;
    }

    .checklist__answer {
      font-weight: bold;
      min-width: 40px;
      text-align: right;
    }

    /* ===== GRID DE FOTOS ===== */
    .photos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 8px;
    }

    .photo {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      border: 0.5pt solid #C9CED6;
      border-radius: 4px;
      page-break-inside: avoid;
    }

    /* ===== ASSINATURAS ===== */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 40px;
      page-break-inside: avoid;
    }

    .signature {
      text-align: center;
    }

    .signature__title {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .signature__image {
      max-width: 180px;
      max-height: 60px;
      object-fit: contain;
      margin: 0 auto 6px;
      display: block;
    }

    .signature__line {
      width: 70%;
      height: 0.5pt;
      background: #000;
      margin: 6px auto;
    }

    .signature__legend {
      font-size: 8px;
      color: #666;
      line-height: 1.4;
    }

    /* ===== UTILITÁRIOS ===== */
    .text-small {
      font-size: 9px;
      color: #666;
    }

    .text-bold {
      font-weight: bold;
    }

    .mb-8 {
      margin-bottom: 8px;
    }

    .audio-indicator {
      display: inline-block;
      padding: 2px 6px;
      background: #E8F4F8;
      border: 0.5pt solid #C9CED6;
      border-radius: 3px;
      font-size: 9px;
      margin-left: 6px;
    }
  `;
}

function renderHeader(company: CompanyData, logo?: string, osNumber?: number): string {
  return `
    <div class="header">
      <div>
        ${logo ? `<img src="${logo}" class="header__logo" alt="Logo">` : ''}
      </div>
      <div class="header__company">
        <div class="header__company-name">${company.name}</div>
        ${company.cnpj ? `<div>CNPJ: ${company.cnpj}</div>` : ''}
        ${company.ie ? `<div>IE: ${company.ie}</div>` : ''}
        ${company.website ? `<div>${company.website}</div>` : ''}
        ${company.email ? `<div>${company.email}</div>` : ''}
        ${company.phone ? `<div>${company.phone}</div>` : ''}
        ${company.address ? `<div>${company.address}</div>` : ''}
      </div>
    </div>
    <div class="title">ORDEM DE SERVIÇO Nº ${osNumber || 'N/A'}</div>
  `;
}

function renderClientAndOsData(call: ServiceCall): string {
  const statusMap = {
    pending: "Aguardando",
    in_progress: "Em Andamento",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };

  const clientInfo: string[] = [];
  
  if (call.clients?.full_name) {
    clientInfo.push(`<p><strong>${call.clients.full_name}</strong></p>`);
  }
  
  if (call.clients?.nome_fantasia && call.clients.nome_fantasia !== call.clients.full_name) {
    clientInfo.push(`<p>Nome Fantasia: ${call.clients.nome_fantasia}</p>`);
  }
  
  if (call.clients?.cpf_cnpj) {
    const doc = call.clients.cpf_cnpj;
    const label = doc.replace(/\D/g, '').length <= 11 ? 'CPF' : 'CNPJ';
    clientInfo.push(`<p>${label}: ${doc}</p>`);
  }
  
  if (call.clients?.state_registration) {
    clientInfo.push(`<p>IE: ${call.clients.state_registration}</p>`);
  }
  
  if (call.clients?.address) {
    clientInfo.push(`<p>Endereço: ${call.clients.address}</p>`);
  }
  
  if (call.clients?.phone) {
    clientInfo.push(`<p>Telefone: ${call.clients.phone}</p>`);
  }
  
  if (call.clients?.email) {
    clientInfo.push(`<p>E-mail: ${call.clients.email}</p>`);
  }

  return `
    <div class="two-columns">
      <div class="section">
        <div class="section__title">Cliente</div>
        <div class="section__content">
          ${clientInfo.join('\n          ')}
        </div>
      </div>
      
      <div class="os-table">
        <div class="os-table__row">
          <div class="os-table__label">Nº OS</div>
          <div class="os-table__value">${call.os_number}</div>
        </div>
        <div class="os-table__row">
          <div class="os-table__label">Data Emissão</div>
          <div class="os-table__value">${format(new Date(call.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
        </div>
        <div class="os-table__row">
          <div class="os-table__label">Status</div>
          <div class="os-table__value">${statusMap[call.status] || call.status}</div>
        </div>
        <div class="os-table__row">
          <div class="os-table__label">Data Prevista</div>
          <div class="os-table__value">${format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}</div>
        </div>
        ${call.status === 'completed' && call.updated_at ? `
          <div class="os-table__row">
            <div class="os-table__label">Data Finalização</div>
            <div class="os-table__value">${format(new Date(call.updated_at), "dd/MM/yyyy", { locale: ptBR })}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderTechnician(call: ServiceCall): string {
  if (!call.technicians?.full_name) return '';
  
  return `
    <div class="section">
      <div class="section__title">Técnico Responsável</div>
      <div class="section__content">
        <p>${call.technicians.full_name}</p>
      </div>
    </div>
  `;
}

function renderSchedule(call: ServiceCall): string {
  const scheduleInfo: string[] = [];
  
  if (call.scheduled_date) {
    scheduleInfo.push(`<p><strong>Data:</strong> ${format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}</p>`);
  }
  
  if (call.scheduled_time) {
    scheduleInfo.push(`<p><strong>Hora:</strong> ${call.scheduled_time}</p>`);
  }
  
  if (call.started_at) {
    scheduleInfo.push(`<p><strong>Início:</strong> ${format(new Date(call.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>`);
  }
  
  if (scheduleInfo.length === 0) return '';
  
  return `
    <div class="section">
      <div class="section__title">Agendamento</div>
      <div class="section__content">
        ${scheduleInfo.join('\n        ')}
      </div>
    </div>
  `;
}

function renderEquipment(call: ServiceCall): string {
  if (!call.equipment_description) return '';
  
  const hasSerial = call.equipment_serial_number;
  
  if (hasSerial) {
    return `
      <div class="grid-two">
        <div class="section">
          <div class="section__title">Equipamento</div>
          <div class="section__content">
            <p>${call.equipment_description}</p>
          </div>
        </div>
        <div class="section">
          <div class="section__title">Nº de Série</div>
          <div class="section__content">
            <p>${call.equipment_serial_number}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="section">
      <div class="section__title">Equipamento</div>
      <div class="section__content">
        <p>${call.equipment_description}</p>
      </div>
    </div>
  `;
}

function renderProblem(call: ServiceCall): string {
  if (!call.problem_description) return '';
  
  return `
    <div class="section">
      <div class="section__title">Problema</div>
      <div class="section__content">
        <p>${call.problem_description}</p>
      </div>
    </div>
  `;
}

function renderActions(call: ServiceCall): string {
  if (!call.technical_diagnosis) return '';
  
  const hasAudio = call.technical_diagnosis_audio_url;
  
  return `
    <div class="section">
      <div class="section__title">Serviços Executados</div>
      <div class="section__content">
        <p>${call.technical_diagnosis}</p>
        ${hasAudio ? '<span class="audio-indicator">🎤 Áudio disponível</span>' : ''}
      </div>
    </div>
  `;
}

function renderNotes(call: ServiceCall): string {
  // NÃO incluir internal_notes_text - apenas notes (visíveis ao cliente)
  if (!call.notes) return '';
  
  return `
    <div class="section">
      <div class="section__title">Observações (Visíveis ao Cliente)</div>
      <div class="section__content">
        <p>${call.notes}</p>
      </div>
    </div>
  `;
}

function renderChecklist(call: ServiceCall, checklistItems: Array<{ id: string; text: string }>): string {
  if (!call.checklist_responses || checklistItems.length === 0) return '';
  
  const responses = call.checklist_responses as Record<string, boolean>;
  const itemTextMap = new Map(checklistItems.map(item => [item.id, item.text]));
  
  const items = Object.entries(responses).map(([itemId, checked], index) => {
    const questionText = `${index + 1}) ${itemTextMap.get(itemId) || itemId}`;
    const answer = checked ? "Sim" : "Não";
    
    return `
      <div class="checklist__item">
        <div class="checklist__question">${questionText}</div>
        <div class="checklist__answer">${answer}</div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="section">
      <div class="section__title">Checklist</div>
      <div class="checklist">
        ${items}
      </div>
    </div>
  `;
}

function renderPhotos(call: ServiceCall): string {
  const allPhotos = [
    ...(call.photos_before_urls || []),
    ...(call.photos_after_urls || [])
  ].filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));
  
  if (allPhotos.length === 0) return '';
  
  const photoElements = allPhotos.map(url => 
    `<img src="${url}" class="photo" alt="Foto do serviço" />`
  ).join('\n        ');
  
  return `
    <div class="section">
      <div class="section__title">Fotos</div>
      <div class="photos">
        ${photoElements}
      </div>
    </div>
  `;
}

function renderSignatures(call: ServiceCall): string {
  const hasTech = call.technician_signature_url || call.technician_signature_data;
  const hasClient = call.customer_signature_url || call.customer_signature_data;
  
  if (!hasTech && !hasClient) return '';
  
  const techSignature = hasTech ? `
    <div class="signature">
      <div class="signature__title">Técnico</div>
      ${call.technician_signature_url || call.technician_signature_data ? `
        <img src="${call.technician_signature_url || call.technician_signature_data}" 
             class="signature__image" alt="Assinatura Técnico" />
      ` : ''}
      <div class="signature__line"></div>
      <div class="signature__legend">
        Assinado por: ${call.technicians?.full_name || 'N/A'}<br/>
        ${call.technician_signature_date ? format(new Date(call.technician_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
      </div>
    </div>
  ` : '<div></div>';
  
  const clientSignature = hasClient ? `
    <div class="signature">
      <div class="signature__title">Cliente</div>
      ${call.customer_signature_url || call.customer_signature_data ? `
        <img src="${call.customer_signature_url || call.customer_signature_data}" 
             class="signature__image" alt="Assinatura Cliente" />
      ` : ''}
      <div class="signature__line"></div>
      <div class="signature__legend">
        Assinado por: ${call.customer_name || call.clients?.full_name || 'N/A'}<br/>
        ${call.customer_position ? `Cargo: ${call.customer_position}<br/>` : ''}
        ${call.customer_signature_date ? format(new Date(call.customer_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
      </div>
    </div>
  ` : '<div></div>';
  
  return `
    <div class="signatures">
      ${techSignature}
      ${clientSignature}
    </div>
  `;
}

export function generateServiceCallHtmlTemplate(
  call: ServiceCall,
  companyData: CompanyData,
  checklistItems: Array<{ id: string; text: string }>,
  logoBase64?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${getTemplateStyles()}
      </style>
    </head>
    <body>
      ${renderHeader(companyData, logoBase64, call.os_number)}
      ${renderClientAndOsData(call)}
      ${renderTechnician(call)}
      ${renderSchedule(call)}
      ${renderEquipment(call)}
      ${renderProblem(call)}
      ${renderActions(call)}
      ${renderNotes(call)}
      ${renderChecklist(call, checklistItems)}
      ${renderPhotos(call)}
      ${renderSignatures(call)}
    </body>
    </html>
  `;
}
