// ============================================================================
// emitir-nf — Emissão e cancelamento de NFSe (Focus NFe) a partir da OS
// ----------------------------------------------------------------------------
// Fase 1: NFSe (serviço) de Pinhais/Frigonox via Focus NFe.
//
// Um único "motor" servindo DOIS chamadores:
//   - Botão na OS (usuário Gerencial autenticado)
//   - CRON futuro (chamada com a SERVICE_ROLE_KEY no Authorization)
//
// Ações:
//   { action: "emitir",   service_call_id, tipo? = "nfse" }
//   { action: "cancelar", service_call_id, tipo? = "nfse", justificativa }
//
// Idempotência: índice único uniq_active_invoice_per_os_tipo no banco impede
// 2 notas ativas (processando/autorizado) por OS+tipo. Após cancelar, libera.
//
// Valores: replicam EXATAMENTE o app (FinanceiroTab). Desconto geral da OS é
// rateado proporcionalmente entre serviço e produto.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.curitibainoxapp.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const digits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

const FOCUS_BASE = {
  homologacao: "https://homologacao.focusnfe.com.br",
  producao: "https://api.focusnfe.com.br",
};

// Preenche placeholders {os} {oc} {equipamento} {forma_pagamento} no template.
function fillTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{os\}/g, vars.os ?? "")
    .replace(/\{oc\}/g, vars.oc ?? "")
    .replace(/\{equipamento\}/g, vars.equipamento ?? "")
    .replace(/\{forma_pagamento\}/g, vars.forma_pagamento ?? "")
    .replace(/\s+OC\s*(?=$|[^0-9])/g, " ") // limpa "OC" solto quando não há OC
    .trim();
}

// Descrição legível da forma de pagamento a partir do payment_config (jsonb).
function describePayment(pc: any): string {
  if (!pc || typeof pc !== "object") return "";
  if (pc.singlePaymentMethod) return String(pc.singlePaymentMethod);
  if (
    Array.isArray(pc.allowedPaymentMethods) &&
    pc.allowedPaymentMethods.length
  )
    return pc.allowedPaymentMethods.join(", ");
  return "";
}

// Normaliza a forma de pagamento (o banco tem grafias mistas: "boleto"/"Boleto",
// "pix"/"PIX", "cartao_credito"/"Cartão de Crédito", etc.).
const PAYMENT_LABELS: Record<string, string> = {
  boleto: "Boleto",
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  "cartão de crédito": "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  "cartão de débito": "Cartão de Débito",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  transferência: "Transferência",
  marketplace: "Marketplace",
  outros: "Outros",
};
const paymentLabel = (m?: string | null) => {
  if (!m) return "";
  const k = m.trim().toLowerCase();
  return PAYMENT_LABELS[k] || m.trim();
};
const brDate = (iso?: string | null) => {
  if (!iso) return "";
  const [y, mo, d] = String(iso).split("T")[0].split("-");
  return d && mo && y ? `${d}/${mo}/${y}` : String(iso);
};
const brMoney = (v: any) =>
  "R$ " +
  (Number(v) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Texto das parcelas (forma de pagamento + vencimento + valor) p/ a NFSe.
const buildPagamentoTexto = (parcelas: any[]): string => {
  if (!parcelas?.length) return "";
  if (parcelas.length === 1) {
    const p = parcelas[0];
    return `Pagamento: ${paymentLabel(p.payment_method)} - venc. ${brDate(
      p.due_date,
    )} - ${brMoney(p.amount)}`;
  }
  const itens = parcelas
    .map(
      (p, i) =>
        `${p.installment_number || i + 1}/${parcelas.length} ${paymentLabel(
          p.payment_method,
        )} venc. ${brDate(p.due_date)} ${brMoney(p.amount)}`,
    )
    .join("; ");
  return `Pagamento (${parcelas.length}x): ${itens}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    const body = await req.json();
    const action: string = body.action;
    const serviceCallId: string = body.service_call_id;
    const tipo: string = body.tipo || "nfse";

    if (!serviceCallId)
      return json({ success: false, error: "service_call_id ausente" }, 400);
    if (tipo !== "nfse") {
      return json(
        { success: false, error: "Apenas NFSe é suportada na Fase 1" },
        400,
      );
    }

    // ---- AUTORIZAÇÃO ---------------------------------------------------------
    // Acesso ao módulo financeiro: leitura (consultar/baixar) exige 'consult';
    // escrita (emitir/cancelar) exige 'edit'. O CRON (service_role) bypassa.
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

    const isCron = bearer && bearer === SERVICE_ROLE_KEY;
    if (!isCron) {
      if (!authHeader)
        return json({ success: false, error: "Não autenticado" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: userErr,
      } = await userClient.auth.getUser();
      if (userErr || !user)
        return json({ success: false, error: "Não autenticado" }, 401);

      const isWrite = action === "emitir" || action === "cancelar";
      const requiredAction = isWrite ? "edit" : "consult";
      const { data: allowed } = await userClient.rpc(
        "check_profile_permission",
        { _user_id: user.id, _module: "finances", _action: requiredAction },
      );
      if (!allowed) {
        return json(
          {
            success: false,
            error: isWrite
              ? "Sem permissão para emitir/cancelar notas (módulo Financeiro)"
              : "Sem permissão para acessar as notas (módulo Financeiro)",
          },
          403,
        );
      }
    }

    // service_role: opera no banco e bypassa RLS
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // =========================================================================
    // AÇÃO: BAIXAR_PDF — proxy do DANFSe (PDF) para download dentro do app.
    // Não depende de token (o PDF do provedor é público); retorna os bytes.
    // O nome do arquivo é definido pelo front.
    // =========================================================================
    if (action === "baixar_pdf") {
      const { data: invoice } = await db
        .from("fiscal_invoices")
        .select("url_danfse")
        .eq("service_call_id", serviceCallId)
        .eq("tipo", tipo)
        .eq("status", "autorizado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!invoice?.url_danfse) {
        return json(
          { success: false, error: "PDF da nota não disponível" },
          404,
        );
      }
      const pdfResp = await fetch(invoice.url_danfse);
      if (!pdfResp.ok) {
        return json(
          { success: false, error: "Falha ao obter o PDF no provedor" },
          502,
        );
      }
      const bytes = new Uint8Array(await pdfResp.arrayBuffer());
      return new Response(bytes, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/pdf" },
      });
    }

    // ---- CONFIG FISCAL + EMISSOR --------------------------------------------
    const { data: fs } = await db
      .from("fiscal_settings")
      .select("*")
      .limit(1)
      .single();
    if (!fs)
      return json(
        { success: false, error: "Configurações fiscais não encontradas" },
        400,
      );

    const { data: ss } = await db
      .from("system_settings")
      .select("company_cnpj, company_ie")
      .limit(1)
      .single();

    const ambiente: "homologacao" | "producao" =
      fs.ambiente === "producao" ? "producao" : "homologacao";
    const token =
      ambiente === "producao" ? fs.token_producao : fs.token_homologacao;
    if (!token) {
      return json(
        {
          success: false,
          error: `Token do Focus (${ambiente}) não configurado`,
        },
        400,
      );
    }
    const baseUrl = FOCUS_BASE[ambiente];
    const authBasic = "Basic " + btoa(`${token}:`);

    // Mapeia o retorno do Focus (POST/GET) para as colunas e atualiza a nota.
    // Reusado pela emissão (após o polling) e pela ação "consultar".
    const applyFocusResult = async (invoiceId: string, final: any) => {
      const st = String(final?.status || "processando");
      if (st === "autorizado") {
        await db
          .from("fiscal_invoices")
          .update({
            status: "autorizado",
            numero: final?.numero ? String(final.numero) : null,
            codigo_verificacao: final?.codigo_verificacao || null,
            url_danfse: final?.url_danfse || final?.url || null,
            caminho_xml:
              final?.caminho_xml_nota_fiscal || final?.caminho_xml || null,
            focus_response: final,
          })
          .eq("id", invoiceId);
        return {
          status: "autorizado",
          numero: final?.numero,
          url_danfse: final?.url || final?.url_danfse,
        };
      }
      if (st === "erro" || st === "erro_autorizacao") {
        const erros = final?.erros;
        const msg = Array.isArray(erros)
          ? erros.map((e: any) => e.mensagem || e).join("; ")
          : final?.mensagem || "Erro na autorização";
        await db
          .from("fiscal_invoices")
          .update({ status: "erro", mensagem_erro: msg, focus_response: final })
          .eq("id", invoiceId);
        return { status: "erro", error: msg };
      }
      // ainda processando: guarda o último retorno
      await db
        .from("fiscal_invoices")
        .update({ focus_response: final })
        .eq("id", invoiceId);
      return { status: st };
    };

    // =========================================================================
    // AÇÃO: CONSULTAR — sincroniza uma nota "processando" com o provedor
    // =========================================================================
    if (action === "consultar") {
      const { data: invoice } = await db
        .from("fiscal_invoices")
        .select("id, ref")
        .eq("service_call_id", serviceCallId)
        .eq("tipo", tipo)
        .eq("status", "processando")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!invoice) return json({ success: true, status: "sem_pendencia" });

      const g = await fetch(
        `${baseUrl}/v2/nfse/${encodeURIComponent(invoice.ref)}`,
        { headers: { Authorization: authBasic } },
      );
      const final = await g.json().catch(() => ({}));
      const res = await applyFocusResult(invoice.id, final);
      return json({ success: res.status !== "erro", ...res });
    }

    // =========================================================================
    // AÇÃO: CANCELAR
    // =========================================================================
    if (action === "cancelar") {
      const justificativa: string = (body.justificativa || "").trim();
      if (justificativa.length < 15) {
        return json(
          {
            success: false,
            error:
              "Justificativa de cancelamento deve ter ao menos 15 caracteres",
          },
          400,
        );
      }

      const { data: invoice } = await db
        .from("fiscal_invoices")
        .select("*")
        .eq("service_call_id", serviceCallId)
        .eq("tipo", tipo)
        .eq("status", "autorizado")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!invoice) {
        return json(
          { success: false, error: "Nenhuma nota autorizada para cancelar" },
          404,
        );
      }

      const cancelResp = await fetch(`${baseUrl}/v2/nfse/${invoice.ref}`, {
        method: "DELETE",
        headers: {
          Authorization: authBasic,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ justificativa }),
      });
      const cancelData = await cancelResp.json().catch(() => ({}));

      if (!cancelResp.ok) {
        return json(
          {
            success: false,
            error: cancelData?.mensagem || "Falha ao cancelar no provedor",
            provider: cancelData,
          },
          400,
        );
      }

      await db
        .from("fiscal_invoices")
        .update({
          status: "cancelado",
          justificativa_cancelamento: justificativa,
          cancelled_at: new Date().toISOString(),
          focus_response: cancelData,
        })
        .eq("id", invoice.id);

      return json({ success: true, status: "cancelado" });
    }

    // =========================================================================
    // AÇÃO: EMITIR
    // =========================================================================
    if (action !== "emitir") {
      return json({ success: false, error: "Ação inválida" }, 400);
    }

    // ---- Carrega OS + cliente + itens ---------------------------------------
    const { data: sc } = await db
      .from("service_calls")
      .select(
        "id, os_number, purchase_order_number, equipment_description, payment_config, " +
          "client_id, discount_total_type, discount_total_value",
      )
      .eq("id", serviceCallId)
      .single();
    if (!sc) return json({ success: false, error: "OS não encontrada" }, 404);

    const { data: client } = await db
      .from("clients")
      .select(
        "id, full_name, cpf_cnpj, email, street, number, complement, neighborhood, " +
          "city, state, cep, codigo_municipio_ibge",
      )
      .eq("id", sc.client_id)
      .single();
    if (!client)
      return json(
        { success: false, error: "Cliente da OS não encontrado" },
        404,
      );

    // Bloqueio: cliente sem CPF/CNPJ
    const docTomador = digits(client.cpf_cnpj);
    if (docTomador.length !== 11 && docTomador.length !== 14) {
      return json(
        {
          success: false,
          error: "CLIENT_SEM_DOC",
          message: "Preencha o CPF/CNPJ do cliente antes de emitir a nota.",
        },
        400,
      );
    }

    const { data: items } = await db
      .from("service_call_items")
      .select("type, total")
      .eq("service_call_id", serviceCallId);

    const all = items || [];
    // Trava: itens FEE/DISCOUNT não são suportados (regra de valor ficaria ambígua)
    if (all.some((i) => i.type === "FEE" || i.type === "DISCOUNT")) {
      return json(
        {
          success: false,
          error:
            "OS contém taxas ou descontos avulsos não suportados na emissão automática",
        },
        400,
      );
    }

    const subtotalServices = round2(
      all
        .filter((i) => i.type === "SERVICE")
        .reduce((s, i) => s + (Number(i.total) || 0), 0),
    );
    const subtotalParts = round2(
      all
        .filter((i) => i.type === "PRODUCT")
        .reduce((s, i) => s + (Number(i.total) || 0), 0),
    );
    const subtotalOS = subtotalServices + subtotalParts;

    if (subtotalServices <= 0) {
      return json(
        { success: false, error: "OS não possui itens de serviço para a NFSe" },
        400,
      );
    }

    // Desconto geral da OS (mesma fórmula do FinanceiroTab) + rateio proporcional
    const dgType = sc.discount_total_type;
    const dgValue = Number(sc.discount_total_value) || 0;
    const osDiscount =
      dgType === "percent"
        ? (subtotalOS * dgValue) / 100
        : Math.min(dgValue, subtotalOS);
    const rateioServico =
      subtotalOS > 0 ? osDiscount * (subtotalServices / subtotalOS) : 0;
    const valorServicos = round2(subtotalServices - rateioServico);

    // ---- Resolve IBGE do tomador (grava no cliente se descobrir) -------------
    let ibgeTomador = digits(client.codigo_municipio_ibge);
    if (ibgeTomador.length !== 7 && docTomador.length === 14) {
      try {
        const r = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${docTomador}`,
          {
            signal: AbortSignal.timeout(8000),
          },
        );
        if (r.ok) {
          const d = await r.json();
          if (d?.codigo_municipio_ibge) {
            ibgeTomador = String(d.codigo_municipio_ibge).replace(/\D/g, "");
            await db
              .from("clients")
              .update({ codigo_municipio_ibge: ibgeTomador })
              .eq("id", client.id);
          }
        }
      } catch (_) {
        /* segue sem IBGE; erro tratado abaixo */
      }
    }
    if (ibgeTomador.length !== 7) {
      return json(
        {
          success: false,
          error: "IBGE_TOMADOR_AUSENTE",
          message:
            "Não foi possível determinar o município (IBGE) do cliente. Verifique o endereço/CNPJ do cliente.",
        },
        400,
      );
    }

    // ---- Discriminação e observações ----------------------------------------
    const tplVars = {
      os: String(sc.os_number ?? ""),
      oc: sc.purchase_order_number ? String(sc.purchase_order_number) : "",
      equipamento: sc.equipment_description || "",
      forma_pagamento: describePayment(sc.payment_config),
    };
    // Parcelas a receber da OS (forma de pagamento, vencimento, valor) -> nota.
    const { data: parcelas } = await db
      .from("financial_transactions")
      .select("installment_number, due_date, amount, payment_method")
      .eq("service_call_id", serviceCallId)
      .eq("direction", "RECEIVE")
      .order("installment_number", { ascending: true });

    const pagamentoTexto = buildPagamentoTexto(parcelas || []);

    const discriminacao = [
      fillTemplate(
        fs.discriminacao_template ||
          "Manutenção de {equipamento} - OS{os} OC{oc}",
        tplVars,
      ),
      pagamentoTexto,
    ]
      .filter(Boolean)
      .join(" | ");

    // ---- Monta payload validado (Pinhais/Focus) -----------------------------
    const tomadorDoc =
      docTomador.length === 14 ? { cnpj: docTomador } : { cpf: docTomador };

    const payload: Record<string, unknown> = {
      data_emissao: new Date().toISOString(),
      natureza_operacao: 1,
      prestador: {
        cnpj: digits(ss?.company_cnpj || fs.cnpj),
        inscricao_municipal: fs.inscricao_municipal,
        codigo_municipio: Number(fs.codigo_municipio),
      },
      tomador: {
        ...tomadorDoc,
        razao_social: client.full_name,
        email: client.email || undefined,
        endereco: {
          logradouro: client.street || "",
          numero: client.number || "S/N",
          complemento: client.complement || undefined,
          bairro: client.neighborhood || "",
          codigo_municipio: Number(ibgeTomador),
          uf: client.state || "",
          cep: digits(client.cep),
        },
      },
      servico: {
        discriminacao,
        valor_servicos: valorServicos,
        aliquota: Number(fs.aliquota_iss),
        item_lista_servico: fs.codigo_servico,
        iss_retido: !!fs.iss_retido,
      },
    };

    // ---- Registro local (status processando) — respeita anti-duplicação -----
    const ref = `os${sc.os_number}-nfse-${Date.now()}`;
    const { data: inserted, error: insErr } = await db
      .from("fiscal_invoices")
      .insert({
        service_call_id: serviceCallId,
        tipo: "nfse",
        ambiente,
        ref,
        status: "processando",
        valor: valorServicos,
        request_payload: payload,
      })
      .select("id")
      .single();

    if (insErr) {
      // Violação do índice único = já existe nota ativa para a OS
      if ((insErr as any).code === "23505") {
        return json(
          {
            success: false,
            error:
              "Esta OS já possui uma NFSe ativa (emitida ou em processamento)",
          },
          409,
        );
      }
      return json({ success: false, error: insErr.message }, 500);
    }
    const invoiceId = inserted!.id;

    // ---- Envia ao Focus ------------------------------------------------------
    const emitResp = await fetch(
      `${baseUrl}/v2/nfse?ref=${encodeURIComponent(ref)}`,
      {
        method: "POST",
        headers: {
          Authorization: authBasic,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const emitData = await emitResp.json().catch(() => ({}));

    // Focus: 202 = aceito/processando; 422/400 = erro de validação imediato
    if (emitResp.status >= 400 && emitResp.status !== 422) {
      await db
        .from("fiscal_invoices")
        .update({
          status: "erro",
          mensagem_erro: emitData?.mensagem || `HTTP ${emitResp.status}`,
          focus_response: emitData,
        })
        .eq("id", invoiceId);
      return json(
        {
          success: false,
          error: emitData?.mensagem || "Falha ao enviar nota",
          provider: emitData,
        },
        400,
      );
    }

    // ---- Polling até autorizado / erro --------------------------------------
    let final = emitData;
    let finalStatus = String(emitData?.status || "processando");
    for (
      let i = 0;
      i < 6 &&
      (finalStatus === "processando" ||
        finalStatus === "processando_autorizacao");
      i++
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      const g = await fetch(`${baseUrl}/v2/nfse/${encodeURIComponent(ref)}`, {
        headers: { Authorization: authBasic },
      });
      final = await g.json().catch(() => ({}));
      finalStatus = String(final?.status || finalStatus);
    }

    // Aplica o resultado (autorizado / erro / ainda processando) via helper
    const res = await applyFocusResult(invoiceId, final);
    if (res.status === "autorizado") {
      return json({
        success: true,
        status: "autorizado",
        numero: res.numero,
        url_danfse: res.url_danfse,
      });
    }
    if (res.status === "erro") {
      return json({ success: false, error: res.error, provider: final }, 400);
    }
    // Ainda processando após o polling — o front sincroniza depois (ação "consultar")
    return json({
      success: true,
      status: res.status,
      message:
        "Nota em processamento. Atualize em instantes para ver o resultado.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("emitir-nf:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
