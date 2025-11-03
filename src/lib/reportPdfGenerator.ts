import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCall } from "@/hooks/useServiceCalls";
import { supabase } from "@/integrations/supabase/client";

// Função para buscar dados da empresa
const getCompanyData = async () => {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("*")
      .maybeSingle();
    
    return {
      name: data?.company_name || "Curitiba Inox",
      cnpj: data?.company_cnpj || "",
      state_inscription: data?.company_ie || "",
      email: data?.company_email || "",
      phone: data?.company_phone || "",
      website: data?.company_website || "",
      address: data?.company_address || "",
      report_logo_url: data?.report_logo || data?.logo_url || "/assets/report-logo.png",
    };
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    return {
      name: "Curitiba Inox",
      cnpj: "",
      state_inscription: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      report_logo_url: "/assets/report-logo.png",
    };
  }
};

// Função para renderizar HTML com dados mapeados
const renderHTMLTemplate = (call: ServiceCall, companyData: any): string => {
  // Mapear dados do cliente
  const client = {
    name: call.clients?.full_name || "N/A",
    trade_name: (call.clients as any)?.nome_fantasia || "",
    cnpj: (call.clients as any)?.cpf_cnpj || "",
    state_inscription: (call.clients as any)?.state_registration || "",
    email: (call.clients as any)?.email || "",
    phone: call.clients?.phone || "",
    address: {
      street: (call.clients as any)?.street || "",
      number: (call.clients as any)?.number || "",
      district: (call.clients as any)?.neighborhood || "",
      city: (call.clients as any)?.city || "",
      state: (call.clients as any)?.state || "",
      zip: (call.clients as any)?.cep || "",
    },
  };

  // Mapear dados da OS
  const os = {
    number: call.os_number,
    status: call.status === "completed" ? "Finalizado" : call.status === "in_progress" ? "Em andamento" : "Pendente",
    open_date: call.created_at,
    schedule: {
      date: call.scheduled_date,
      time: call.scheduled_time,
    },
    started_at: call.started_at || null,
    closed_at: call.status === "completed" ? call.updated_at : null,
    service_type: (call as any).service_types?.name || "N/A",
    equipment: {
      name: call.equipment_description,
      serial: call.equipment_serial_number || "N/A",
    },
    problem: call.problem_description || "N/A",
    services_done: call.technical_diagnosis || "N/A",
    parts_used: call.notes || "N/A",
    technician: {
      name: call.technicians?.full_name || "N/A",
    },
    tech_signed_at: call.technician_signature_date || null,
    client_contact: {
      name: call.customer_name || "N/A",
      role: call.customer_position || "N/A",
    },
    client_signed_at: call.customer_signature_date || null,
  };

  // Função auxiliar para formatar datas
  const formatDate = (date: string | null, formatStr: string) => {
    if (!date) return "—";
    try {
      return format(new Date(date), formatStr, { locale: ptBR });
    } catch {
      return "—";
    }
  };

  // Template HTML (injetar dados)
  return `
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Ordem de Serviço</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
  body { font-size: 11px; color:#111; margin:0; padding:16mm 14mm; background: white; width: 210mm; }
  .row { display:flex; gap:10px; }
  .col { flex:1 1 0; }
  .right { text-align:right; }
  .mt8{margin-top:8px} .mt12{margin-top:12px} .mt16{margin-top:16px}
  .mb8{margin-bottom:8px} .mb12{margin-bottom:12px}
  .title { font-size:16px; font-weight:700; text-align:center; margin:6px 0 10px; }
  .subtle { color:#444; font-size: 10px; }
  .box { border:0.6pt solid #000; padding:8px; border-radius:2px; }
  .box-title { font-weight:700; margin:0 0 6px; }
  .kv { display:flex; }
  .kv > div:first-child { width:110px; font-weight:700; }
  .kv + .kv { margin-top:4px; }
  .tight .kv > div:first-child { width:95px; }
  .logo { height:40px; width:140px; object-fit:contain; }
  .break { page-break-inside: avoid; }
  .nowrap { white-space:nowrap; }
  .wrap { word-break:break-word; overflow-wrap: anywhere; }
  .sign { height:85px; border:0.6pt solid #000; border-radius:2px; background-size:contain; background-repeat:no-repeat; background-position:center; }
  .sign-label { font-weight:700; margin-top:4px; }
  hr.sep { border:0; border-top:0.6pt solid #000; margin:10px 0; }
</style>
</head>
<body>

<!-- CABEÇALHO -->
<div class="row" style="align-items:flex-start;">
  <div class="col">
    <img class="logo" src="${companyData.report_logo_url}" alt="Logo" crossorigin="anonymous">
  </div>
  <div class="col right wrap">
    <div><b>${companyData.name}</b></div>
    ${companyData.cnpj || companyData.state_inscription ? `<div class="subtle">CNPJ: ${companyData.cnpj}${companyData.state_inscription ? ' • IE: ' + companyData.state_inscription : ''}</div>` : ''}
    ${companyData.email || companyData.phone ? `<div class="subtle">${companyData.email}${companyData.phone ? ' • ' + companyData.phone : ''}</div>` : ''}
    ${companyData.website ? `<div class="subtle">${companyData.website}</div>` : ''}
    ${companyData.address ? `<div class="subtle">${companyData.address}</div>` : ''}
  </div>
</div>

<hr class="sep"/>

<div class="title">ORDEM DE SERVIÇO Nº ${os.number}</div>

<!-- RESUMO À DIREITA -->
<div class="row mt8">
  <div class="col box break">
    <div class="box-title">Cliente</div>
    <div class="wrap"><b>${client.name}</b></div>
    ${client.trade_name ? `<div class="subtle wrap">${client.trade_name}</div>` : ''}
    ${client.address.street ? `<div class="subtle wrap">${client.address.street}${client.address.number ? ', ' + client.address.number : ''}${client.address.district ? ' - ' + client.address.district : ''}</div>` : ''}
    ${client.address.city || client.address.state ? `<div class="subtle wrap">${client.address.city}${client.address.state ? ' / ' + client.address.state : ''}${client.address.zip ? ' • CEP ' + client.address.zip : ''}</div>` : ''}
    ${client.cnpj || client.state_inscription ? `<div class="subtle">CNPJ: ${client.cnpj}${client.state_inscription ? ' • IE: ' + client.state_inscription : ''}</div>` : ''}
    ${client.phone || client.email ? `<div class="subtle">Fone: ${client.phone}${client.email ? ' • E-mail: ' + client.email : ''}</div>` : ''}
  </div>

  <div class="col" style="flex:0 0 210px">
    <div class="box tight">
      <div class="kv"><div>Nº OS</div><div class="nowrap">${os.number}</div></div>
      <div class="kv"><div>Data</div><div>${formatDate(os.open_date, "dd/MM/yyyy")}</div></div>
      <div class="kv"><div>Prevista</div><div>${formatDate(os.schedule.date, "dd/MM/yyyy")}</div></div>
      <div class="kv"><div>Status</div><div>${os.status}</div></div>
      ${os.closed_at ? `<div class="kv"><div>Finalizado</div><div>${formatDate(os.closed_at, "dd/MM/yyyy HH:mm")}</div></div>` : ''}
    </div>
  </div>
</div>

<!-- TÉCNICO / AGENDAMENTO -->
<div class="row mt12">
  <div class="col box">
    <div class="box-title">Técnico responsável</div>
    <div>${os.technician.name}</div>
  </div>
  <div class="col box">
    <div class="box-title">Agendamento</div>
    <div class="kv"><div>Data</div><div>${formatDate(os.schedule.date, "dd/MM/yyyy")}</div></div>
    <div class="kv"><div>Hora</div><div>${os.schedule.time}</div></div>
    ${os.started_at ? `<div class="kv"><div>Início</div><div>${formatDate(os.started_at, "dd/MM/yyyy HH:mm")}</div></div>` : ''}
    <div class="kv"><div>Tipo</div><div class="wrap">${os.service_type}</div></div>
  </div>
</div>

<!-- EQUIPAMENTO / PROBLEMA -->
<div class="row mt12">
  <div class="col box">
    <div class="box-title">Equipamento</div>
    <div class="wrap">
      ${os.equipment.name}${os.equipment.serial !== 'N/A' ? `<span class="subtle"> • Nº de série: ${os.equipment.serial}</span>` : ''}
    </div>
  </div>
  <div class="col box">
    <div class="box-title">Problema</div>
    <div class="wrap">${os.problem}</div>
  </div>
</div>

<!-- SERVIÇOS / PEÇAS -->
<div class="row mt12">
  <div class="col box break">
    <div class="box-title">Serviços executados</div>
    <div class="wrap">${os.services_done}</div>
  </div>
  <div class="col box break">
    <div class="box-title">Peças utilizadas</div>
    <div class="wrap">${os.parts_used}</div>
  </div>
</div>

<!-- ASSINATURAS -->
<div class="row mt16 break">
  <div class="col">
    <div class="sign" style="${call.technician_signature_data ? `background-image: url('${call.technician_signature_data}');` : ''}"></div>
    <div class="sign-label">TÉCNICO</div>
    <div class="subtle">${os.technician.name}${os.tech_signed_at ? ' • ' + formatDate(os.tech_signed_at, "dd/MM/yyyy HH:mm") : ''}</div>
  </div>
  <div class="col">
    <div class="sign" style="${call.customer_signature_data ? `background-image: url('${call.customer_signature_data}');` : ''}"></div>
    <div class="sign-label">CLIENTE</div>
    <div class="subtle wrap">${os.client_contact.name}${os.client_contact.role !== 'N/A' ? ' • ' + os.client_contact.role : ''}</div>
    ${os.client_signed_at ? `<div class="subtle">${formatDate(os.client_signed_at, "dd/MM/yyyy HH:mm")}</div>` : ''}
  </div>
</div>

</body>
</html>
  `;
};

// Função principal para gerar PDF
export const generateServiceCallReport = async (call: ServiceCall): Promise<jsPDF> => {
  try {
    // Buscar dados da empresa
    const companyData = await getCompanyData();

    // Renderizar HTML
    const htmlContent = renderHTMLTemplate(call, companyData);

    // Criar elemento temporário no DOM
    const container = document.createElement("div");
    container.innerHTML = htmlContent;
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.width = "210mm"; // A4
    document.body.appendChild(container);

    // Aguardar carregamento de imagens
    const images = container.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map((img) => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(true);
          } else {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
          }
        });
      })
    );

    // Aguardar um pouco mais para garantir renderização
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Renderizar HTML → Canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // Remover elemento temporário
    document.body.removeChild(container);

    // Converter Canvas → PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    // Salvar PDF
    pdf.save(`OS_${call.os_number}_${call.clients?.full_name || "cliente"}.pdf`);

    return pdf;
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
};
