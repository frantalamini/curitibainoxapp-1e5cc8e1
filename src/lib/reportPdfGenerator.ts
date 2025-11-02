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
    photos: [
      ...(call.photos_before_urls || []).map(url => ({ url })),
      ...(call.photos_after_urls || []).map(url => ({ url })),
      ...(call.media_urls || []).map(url => ({ url })),
    ].filter(photo => photo.url),
    signatures: {
      technician: call.technician_signature_data || "",
      client: call.customer_signature_data || "",
    }
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
<meta charset="utf-8"/>
<title>OS ${os.number}</title>
<style>
  /* ——— Página ——— */
  @page { size: A4; margin: 25mm; }
  * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
  body { font-size: 11px; color:#111; line-height: 1.35; margin:0; padding:25mm; }
  p, div { word-break: normal; overflow-wrap: anywhere; hyphens: none; }

  /* ——— Utilitários ——— */
  .row{display:flex;gap:10px} .col{flex:1 1 0}
  .right{text-align:right} .wrap{word-break:normal;overflow-wrap:anywhere;hyphens:none}
  .mt8{margin-top:8px} .mt12{margin-top:12px} .mt16{margin-top:16px}
  .mb0{margin-bottom:0} .sep{border:0;border-top:.6pt solid #000;margin:10px 0}
  .break{page-break-inside:avoid}
  .tight{margin-top:2px}

  /* ——— Cabeçalho ——— */
  .logo { width:140px; height:40px; object-fit:contain; }

  /* ——— Boxes ——— */
  .box{border:.6pt solid #000;border-radius:2px;padding:10px 10px 8px}
  .hdr{
    text-transform:uppercase; font-weight:700; font-size:11px;
    margin:-6px 0 6px;
    position:relative; top:-4px;
  }
  .kv{display:flex;gap:6px}
  .kv > div:first-child{width:92px;font-weight:700}
  .kv + .kv {margin-top:3px}

  /* ——— Fotos/Anexos ——— */
  .photos{display:flex;flex-wrap:wrap;gap:8px}
  .ph{flex:0 0 calc(33.333% - 6px); border:.6pt solid #000; border-radius:2px; padding:4px}
  .ph img{width:100%; height:120px; object-fit:contain}

  /* ——— Assinaturas no rodapé ——— */
  .footer{margin-top:18mm; page-break-inside:avoid}
  .sigArea{height:85px; position:relative; display:flex; align-items:flex-end}
  .sigImg{position:absolute; left:0; right:0; top:0; bottom:18px; margin:auto; max-height:80px; object-fit:contain}
  .sigLine{border-top:.8pt solid #000; height:0; width:100%}
  .sigLabel{margin-top:4px; font-weight:700}
  .small{color:#444; font-size:10px}
</style>
</head>
<body>

<!-- CABEÇALHO -->
<div class="row" style="align-items:flex-start">
  <div class="col">
    <img class="logo" src="${companyData.report_logo_url}" alt="Logo">
  </div>
  <div class="col right wrap">
    <div><b>${companyData.name}</b></div>
    <div class="small">CNPJ: ${companyData.cnpj} • IE: ${companyData.state_inscription}</div>
    <div class="small">${companyData.email} • ${companyData.phone} • ${companyData.website}</div>
    <div class="small">${companyData.address}</div>
  </div>
</div>

<hr class="sep"/>

<div style="text-align:center;font-weight:700;font-size:16px;margin-bottom:8px">
  ORDEM DE SERVIÇO Nº ${os.number}
</div>

<!-- RESUMO (Nº OS, datas, status à direita) -->
<div class="row mt8">
  <div class="col box break">
    <div class="hdr">Cliente</div>
    <div class="wrap"><b>${client.name}</b></div>
    ${client.trade_name ? `<div class="small wrap">${client.trade_name}</div>` : ''}
    <div class="small wrap">${client.address.street}, ${client.address.number} - ${client.address.district}</div>
    <div class="small wrap">${client.address.city} / ${client.address.state} • CEP ${client.address.zip}</div>
    <div class="small">CNPJ: ${client.cnpj} • IE: ${client.state_inscription}</div>
    <div class="small">Fone: ${client.phone} • E-mail: ${client.email}</div>
  </div>

  <div class="col" style="flex:0 0 210px">
    <div class="box">
      <div class="hdr">Resumo</div>
      <div class="kv"><div>Nº OS</div><div>${os.number}</div></div>
      <div class="kv"><div>Data</div><div>${formatDate(os.open_date, "dd/MM/yyyy")}</div></div>
      <div class="kv"><div>Prevista</div><div>${formatDate(os.schedule.date, "dd/MM/yyyy")}</div></div>
      <div class="kv"><div>Status</div><div>${os.status}</div></div>
      <div class="kv"><div>Finalizado</div><div>${formatDate(os.closed_at, "dd/MM/yyyy HH:mm")}</div></div>
    </div>
  </div>
</div>

<!-- TÉCNICO / AGENDAMENTO -->
<div class="row mt12">
  <div class="col box">
    <div class="hdr">Técnico responsável</div>
    <div>${os.technician.name}</div>
  </div>
  <div class="col box">
    <div class="hdr">Agendamento</div>
    <div class="kv"><div>Data</div><div>${formatDate(os.schedule.date, "dd/MM/yyyy")}</div></div>
    <div class="kv"><div>Hora</div><div>${os.schedule.time}</div></div>
    <div class="kv"><div>Início</div><div>${formatDate(os.started_at, "dd/MM/yyyy HH:mm")}</div></div>
    <div class="kv"><div>Tipo</div><div class="wrap">${os.service_type}</div></div>
  </div>
</div>

<!-- EQUIPAMENTO / PROBLEMA -->
<div class="row mt12">
  <div class="col box">
    <div class="hdr">Equipamento</div>
    <div class="wrap">${os.equipment.name} <span class="small">• Nº de série: ${os.equipment.serial}</span></div>
  </div>
  <div class="col box">
    <div class="hdr">Problema</div>
    <div class="wrap">${os.problem}</div>
  </div>
</div>

<!-- SERVIÇOS / PEÇAS -->
<div class="row mt12">
  <div class="col box break">
    <div class="hdr">Serviços executados</div>
    <div class="wrap">${os.services_done}</div>
  </div>
  <div class="col box break">
    <div class="hdr">Peças utilizadas</div>
    <div class="wrap">${os.parts_used}</div>
  </div>
</div>

<!-- FOTOS / ANEXOS (3 por linha, com quebras automáticas) -->
${os.photos.length > 0 ? `
  <div class="box mt16 break">
    <div class="hdr">Anexos (fotos)</div>
    <div class="photos">
      ${os.photos.map(photo => `<div class="ph break"><img src="${photo.url}" alt="foto"></div>`).join('')}
    </div>
  </div>
` : ''}

<!-- ASSINATURAS (rodapé) -->
<div class="row footer">
  <div class="col">
    <div class="sigArea">
      ${os.signatures.technician ? `<img class="sigImg" src="${os.signatures.technician}" alt="Assinatura técnico">` : ''}
      <div class="sigLine"></div>
    </div>
    <div class="sigLabel">TÉCNICO</div>
    <div class="small">${os.technician.name} • ${formatDate(os.tech_signed_at, "dd/MM/yyyy HH:mm")}</div>
  </div>
  <div class="col">
    <div class="sigArea">
      ${os.signatures.client ? `<img class="sigImg" src="${os.signatures.client}" alt="Assinatura cliente">` : ''}
      <div class="sigLine"></div>
    </div>
    <div class="sigLabel">CLIENTE</div>
    <div class="small wrap">${os.client_contact.name} • ${os.client_contact.role} • ${formatDate(os.client_signed_at, "dd/MM/yyyy HH:mm")}</div>
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
