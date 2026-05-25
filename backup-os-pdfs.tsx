/**
 * Script para gerar PDFs de TODAS as OS com dados financeiros.
 * Uso: npx tsx backup-os-pdfs.tsx
 */
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { OSReport } from "./src/components/pdf/OSReport";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://www.curitibainoxapp.com/supabase";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    "ERRO: Defina SUPABASE_SERVICE_ROLE_KEY como variável de ambiente.",
  );
  console.error(
    "Uso: SUPABASE_SERVICE_ROLE_KEY=sua_chave npx tsx backup-os-pdfs.tsx",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const OUTPUT_DIR = path.resolve("C:/Users/user/projetos/Backup OS's 07-04-26");

function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const part = dateStr.split("T")[0];
  const [y, m, d] = part.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFinancialData(osId: string, osData: any) {
  const { data: items } = await supabase
    .from("service_call_items")
    .select("*")
    .eq("service_call_id", osId)
    .order("created_at");

  const { data: transactions } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("service_call_id", osId)
    .eq("direction", "RECEIVE")
    .order("due_date")
    .order("installment_number");

  const productItems = items?.filter((i) => i.type === "PRODUCT") || [];
  const serviceItems = items?.filter((i) => i.type === "SERVICE") || [];
  const feeItems = items?.filter((i) => i.type === "FEE") || [];
  const discountItems = items?.filter((i) => i.type === "DISCOUNT") || [];

  const totalProducts = productItems.reduce(
    (sum, i) => sum + (i.total || 0),
    0,
  );
  const totalServices = serviceItems.reduce(
    (sum, i) => sum + (i.total || 0),
    0,
  );
  const totalFees = feeItems.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalDiscounts = discountItems.reduce(
    (sum, i) => sum + (i.total || 0),
    0,
  );

  const partsDiscountValue = osData.discount_parts_value || 0;
  const servicesDiscountValue = osData.discount_services_value || 0;
  const totalDiscountValue = osData.discount_total_value || 0;

  let partsDiscount =
    osData.discount_parts_type === "percentage"
      ? totalProducts * (partsDiscountValue / 100)
      : partsDiscountValue;

  let servicesDiscount =
    osData.discount_services_type === "percentage"
      ? totalServices * (servicesDiscountValue / 100)
      : servicesDiscountValue;

  const subtotalAfterGroupDiscounts =
    totalProducts + totalServices - partsDiscount - servicesDiscount;

  let generalDiscount =
    osData.discount_total_type === "percentage"
      ? subtotalAfterGroupDiscounts * (totalDiscountValue / 100)
      : totalDiscountValue;

  const grandTotal =
    subtotalAfterGroupDiscounts + totalFees - totalDiscounts - generalDiscount;

  const mappedItems = (items || []).map((item) => ({
    type: item.type as "PRODUCT" | "SERVICE" | "FEE" | "DISCOUNT",
    description: item.description,
    qty: item.qty || 1,
    unitPrice: item.unit_price || 0,
    discountType: item.discount_type,
    discountValue: item.discount_value || 0,
    total: item.total || 0,
  }));

  const installments = (transactions || [])
    .filter((t) => t.status !== "CANCELED")
    .map((t) => ({
      number: t.installment_number || 1,
      dueDate: formatDateOnly(t.due_date),
      amount: t.amount || 0,
      paymentMethod: t.payment_method,
      notes: t.notes || null,
      status: t.status || "OPEN",
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
}

/** Gera signed URL a partir de URL armazenada (tenta extrair path se expirada) */
async function resolveImageUrl(url: string): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url;

  // Tentar usar a URL diretamente (signed URLs com 1 ano de validade)
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) return url;
  } catch {}

  // Se falhou, tentar extrair path do storage e gerar nova signed URL
  const match = url.match(/\/service-call-attachments\/([^?]+)/);
  if (match) {
    const { data } = await supabase.storage
      .from("service-call-attachments")
      .createSignedUrl(match[1], 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  return null;
}

async function resolveImages(urls: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const url of urls) {
    // Filtrar vídeos
    const lower = url.toLowerCase();
    if (
      [".mp4", ".mov", ".m4v", ".webm", ".avi"].some((ext) =>
        lower.includes(ext),
      )
    )
      continue;

    const resolved = await resolveImageUrl(url);
    if (resolved) results.push(resolved);
  }
  return results;
}

async function main() {
  console.log("📋 Buscando todas as OS...");

  // Buscar todas as OS
  const { data: allOS, error } = await supabase
    .from("service_calls")
    .select(
      `
      *,
      clients (full_name, cpf_cnpj, state_registration, address, city, state, cep, phone, email),
      technicians (full_name, phone),
      service_types (name),
      status:service_call_statuses!service_calls_status_id_fkey (name)
    `,
    )
    .order("os_number", { ascending: true });

  if (error || !allOS) {
    console.error("❌ Erro ao buscar OS:", error);
    process.exit(1);
  }

  console.log(`✅ ${allOS.length} OS encontradas`);

  // Buscar dados da empresa
  const { data: companyData } = await supabase
    .from("system_settings")
    .select("*")
    .single();

  const company: any = companyData || {};

  // Resolver logo da empresa
  let logoUrl: string | undefined;
  const rawLogo = company.report_logo || company.logo_url;
  if (rawLogo) {
    const resolved = await resolveImageUrl(rawLogo);
    if (resolved) logoUrl = resolved;
  }

  const companyAddressParts = [company.company_address].filter(Boolean);
  const companyAddress =
    companyAddressParts.length > 0 ? companyAddressParts.join(", ") : undefined;

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < allOS.length; i++) {
    const os = allOS[i] as any;
    const clientData = os.clients as any;
    const clientName = clientData?.full_name || "Sem Cliente";
    const osNum = os.os_number;
    const ocNum = os.purchase_order_number
      ? ` - OC ${os.purchase_order_number}`
      : "";
    const pdfName = sanitizeFilename(`${clientName} - OS ${osNum}${ocNum}.pdf`);

    process.stdout.write(
      `[${i + 1}/${allOS.length}] OS ${osNum} - ${clientName}...`,
    );

    try {
      // Buscar dados financeiros
      const financialData = await fetchFinancialData(os.id, os);

      // Resolver fotos (sem converter - @react-pdf/renderer busca direto em Node.js)
      const beforeImages = await resolveImages(os.photos_before_urls || []);
      const afterImages = await resolveImages(os.photos_after_urls || []);
      const mediaImages = await resolveImages(os.media_urls || []);

      // Resolver assinaturas
      const signatures = (os.signatures as any[]) || [];
      const techSig = signatures
        .filter((s: any) => s.role === "tech")
        .sort(
          (a: any, b: any) =>
            new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime(),
        )[0];
      const clientSig = signatures
        .filter((s: any) => s.role === "client")
        .sort(
          (a: any, b: any) =>
            new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime(),
        )[0];

      let techSigUrl: string | null = null;
      if (techSig?.storage_path) {
        const { data } = await supabase.storage
          .from("service-call-attachments")
          .createSignedUrl(techSig.storage_path, 3600);
        techSigUrl = data?.signedUrl || null;
      } else if (techSig?.image_url) {
        techSigUrl = await resolveImageUrl(techSig.image_url);
      } else if (os.technician_signature_url) {
        techSigUrl = await resolveImageUrl(os.technician_signature_url);
      }

      let clientSigUrl: string | null = null;
      if (clientSig?.storage_path) {
        const { data } = await supabase.storage
          .from("service-call-attachments")
          .createSignedUrl(clientSig.storage_path, 3600);
        clientSigUrl = data?.signedUrl || null;
      } else if (clientSig?.image_url) {
        clientSigUrl = await resolveImageUrl(clientSig.image_url);
      } else if (os.customer_signature_url) {
        clientSigUrl = await resolveImageUrl(os.customer_signature_url);
      }

      // Checklist
      let checklist: any = null;
      if (os.checklist_id && os.checklist_responses) {
        const { data: checklistData } = await supabase
          .from("checklists")
          .select("name, items")
          .eq("id", os.checklist_id)
          .single();

        if (checklistData) {
          const responses = os.checklist_responses as Record<string, boolean>;
          checklist = {
            title: checklistData.name,
            filledBy: os.technicians?.full_name || undefined,
            sections: [
              {
                title: "Itens do Checklist",
                items: (
                  checklistData.items as Array<{ id: string; text: string }>
                ).map((item) => ({
                  label: item.text,
                  status: responses[item.id] ? "OK" : "Pendente",
                  note: null,
                  photos: [],
                })),
              },
            ],
          };
        }
      }

      // Endereço do cliente
      const clientAddressParts = [
        clientData?.address,
        clientData?.city && clientData?.state
          ? `${clientData.city}/${clientData.state}`
          : clientData?.city || clientData?.state,
        clientData?.cep ? `CEP: ${clientData.cep}` : null,
      ].filter(Boolean);
      const clientAddress =
        clientAddressParts.length > 0
          ? clientAddressParts.join(", ")
          : undefined;

      // Formatação de datas
      const formatDate = (d: string | null) => {
        if (!d) return undefined;
        try {
          const dt = new Date(d);
          return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
        } catch {
          return undefined;
        }
      };

      const report = {
        company: {
          name: company.company_name || "Curitiba Inox",
          cnpj: company.company_cnpj?.trim() || undefined,
          ie: company.company_ie?.trim() || undefined,
          phone: company.company_phone?.trim() || undefined,
          email: company.company_email?.trim() || undefined,
          site: company.company_website?.trim() || undefined,
          address: companyAddress,
          logoDataUrl: logoUrl,
        },
        os: {
          number: osNum,
          scheduledDate: formatDateOnly(os.scheduled_date),
          scheduledTime: os.scheduled_time || undefined,
          technicianName: os.technicians?.full_name || undefined,
          technicalStatus: (os as any).status?.name || undefined,
          conclusionDate: formatDate(os.updated_at),
        },
        client: {
          name: clientName,
          phone: clientData?.phone?.trim() || undefined,
          email: clientData?.email?.trim() || undefined,
          cnpj: clientData?.cpf_cnpj?.trim() || undefined,
          ie: clientData?.state_registration?.trim() || undefined,
          address: clientAddress,
        },
        general: {
          equipment: os.equipment_description?.trim() || undefined,
          serialNumber: os.equipment_serial_number?.trim() || undefined,
          purchaseOrderNumber: os.purchase_order_number?.trim() || undefined,
          problemDescription: os.problem_description?.trim() || undefined,
          serviceType: os.service_types?.name?.trim() || undefined,
          checklistTitle: checklist?.title || null,
          notes: os.notes?.trim() || null,
          schedule: {
            date: formatDateOnly(os.scheduled_date),
            time: os.scheduled_time || undefined,
            startedAt: os.started_at ? formatDate(os.started_at) : undefined,
          },
          technician: os.technicians?.full_name
            ? { name: os.technicians.full_name }
            : undefined,
        },
        technical: {
          analysisAndActions: os.technical_diagnosis?.trim() || null,
          extraFields: [],
        },
        photos: {
          before: { images: [...mediaImages, ...beforeImages] },
          after: { images: afterImages },
        },
        checklist,
        signatures: {
          tech: techSigUrl
            ? {
                name:
                  techSig?.signed_by || os.technicians?.full_name || "Técnico",
                imageDataUrl: techSigUrl,
              }
            : null,
          client: clientSigUrl
            ? {
                name: clientSig?.signed_by || os.customer_name || "Cliente",
                role:
                  clientSig?.position?.trim() ||
                  os.customer_position?.trim() ||
                  undefined,
                imageDataUrl: clientSigUrl,
              }
            : null,
        },
        financial: financialData,
      };

      // Renderizar PDF
      const buffer = await renderToBuffer(
        React.createElement(OSReport, { data: report }),
      );

      // Salvar no disco
      const filePath = path.join(OUTPUT_DIR, pdfName);
      fs.writeFileSync(filePath, buffer);

      success++;
      console.log(" ✅");
    } catch (err: any) {
      failed++;
      errors.push(`OS ${osNum}: ${err.message}`);
      console.log(` ❌ ${err.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════");
  console.log(`✅ ${success} PDFs gerados com sucesso`);
  if (failed > 0) {
    console.log(`❌ ${failed} falharam:`);
    errors.forEach((e) => console.log(`   - ${e}`));
  }
  console.log(`📁 Salvos em: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
