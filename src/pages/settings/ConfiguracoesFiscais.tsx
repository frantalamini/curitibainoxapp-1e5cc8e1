import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, FileText, Search } from "lucide-react";
import { useFiscalSettings, FiscalSettings } from "@/hooks/useFiscalSettings";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";

type FormState = {
  provider: string;
  ambiente: "homologacao" | "producao";
  token_homologacao: string;
  token_producao: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  regime_tributario: string;
  optante_simples_nacional: boolean;
  incentivador_cultural: boolean;
  codigo_municipio: string;
  codigo_servico: string;
  item_lista_servico: string;
  nbs: string;
  cnae: string;
  aliquota_iss: string;
  iss_retido: boolean;
  natureza_operacao: string;
  discriminacao_template: string;
  observacoes_template: string;
};

const fromSettings = (f: FiscalSettings | null): FormState => ({
  provider: f?.provider ?? "focus_nfe",
  ambiente: f?.ambiente ?? "homologacao",
  token_homologacao: f?.token_homologacao ?? "",
  token_producao: f?.token_producao ?? "",
  cnpj: f?.cnpj ?? "",
  inscricao_estadual: f?.inscricao_estadual ?? "",
  inscricao_municipal: f?.inscricao_municipal ?? "",
  regime_tributario: f?.regime_tributario ?? "simples_nacional",
  optante_simples_nacional: f?.optante_simples_nacional ?? false,
  incentivador_cultural: f?.incentivador_cultural ?? false,
  codigo_municipio: f?.codigo_municipio ?? "",
  codigo_servico: f?.codigo_servico ?? "",
  item_lista_servico: f?.item_lista_servico ?? "",
  nbs: f?.nbs ?? "",
  cnae: f?.cnae ?? "",
  aliquota_iss: f?.aliquota_iss != null ? String(f.aliquota_iss) : "",
  iss_retido: f?.iss_retido ?? false,
  natureza_operacao: f?.natureza_operacao ?? "",
  discriminacao_template:
    f?.discriminacao_template ?? "Manutenção de {equipamento} - OS{os} OC{oc}",
  observacoes_template:
    f?.observacoes_template ??
    "Manutenção de {equipamento} - OS{os} OC{oc} - Forma de pagamento: {forma_pagamento}",
});

const ConfiguracoesFiscais = () => {
  const navigate = useNavigate();
  const { fiscal, isLoading, updateFiscalSettings } = useFiscalSettings();
  const { settings: companySettings } = useSystemSettings();
  const { lookupCNPJ, isLoading: cnpjLoading } = useCNPJLookup();
  const [form, setForm] = useState<FormState>(fromSettings(null));

  useEffect(() => {
    if (fiscal) setForm(fromSettings(fiscal));
  }, [fiscal]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Busca automática: puxa o código do município (IBGE) da Receita pelo CNPJ
  // da empresa (cadastrado em Dados da Empresa — fonte única).
  const handleBuscarCNPJ = async () => {
    const cnpj = companySettings?.company_cnpj;
    if (!cnpj) return;
    const data = await lookupCNPJ(cnpj);
    if (data?.codigo_municipio_ibge) {
      set("codigo_municipio", data.codigo_municipio_ibge);
    }
  };

  const handleSave = async () => {
    await updateFiscalSettings.mutateAsync({
      provider: form.provider,
      ambiente: form.ambiente,
      token_homologacao: form.token_homologacao.trim() || null,
      token_producao: form.token_producao.trim() || null,
      // CNPJ e Inscrição Estadual vêm de Dados da Empresa (fonte única) —
      // não duplicamos aqui.
      inscricao_municipal: form.inscricao_municipal.trim() || null,
      regime_tributario: form.regime_tributario || null,
      optante_simples_nacional: form.optante_simples_nacional,
      incentivador_cultural: form.incentivador_cultural,
      codigo_municipio: form.codigo_municipio.trim() || null,
      codigo_servico: form.codigo_servico.trim() || null,
      item_lista_servico: form.item_lista_servico.trim() || null,
      nbs: form.nbs.trim() || null,
      cnae: form.cnae.trim() || null,
      aliquota_iss:
        form.aliquota_iss.trim() === ""
          ? null
          : Number(form.aliquota_iss.replace(",", ".")),
      iss_retido: form.iss_retido,
      natureza_operacao: form.natureza_operacao.trim() || null,
      discriminacao_template: form.discriminacao_template,
      observacoes_template: form.observacoes_template,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7" /> Configurações Fiscais
            </h1>
            <p className="text-muted-foreground">
              Parâmetros de emissão de Nota Fiscal (NFSe / NFe). O sistema usa
              estes dados para emitir as notas.
            </p>
          </div>
        </div>

        {/* Provedor & Ambiente */}
        <Card>
          <CardHeader>
            <CardTitle>Provedor & Ambiente</CardTitle>
            <CardDescription>
              Gateway de emissão e tokens de acesso (homologação = testes;
              produção = valor fiscal real).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Provedor</Label>
              <Select
                value={form.provider}
                onValueChange={(v) => set("provider", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focus_nfe">Focus NFe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ambiente ativo</Label>
              <Select
                value={form.ambiente}
                onValueChange={(v) =>
                  set("ambiente", v as "homologacao" | "producao")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">
                    Homologação (testes)
                  </SelectItem>
                  <SelectItem value="producao">Produção (real)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="token_homologacao">Token de Homologação</Label>
              <Input
                id="token_homologacao"
                type="password"
                value={form.token_homologacao}
                onChange={(e) => set("token_homologacao", e.target.value)}
                placeholder="Token do ambiente de teste"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="token_producao">Token de Produção</Label>
              <Input
                id="token_producao"
                type="password"
                value={form.token_producao}
                onChange={(e) => set("token_producao", e.target.value)}
                placeholder="Token do ambiente real"
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados do Emissor */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Emissor (Prestador)</CardTitle>
            <CardDescription>
              CNPJ, Inscrição Estadual e endereço vêm de{" "}
              <button
                type="button"
                className="underline text-primary"
                onClick={() => navigate("/settings")}
              >
                Configurações → Dados da Empresa
              </button>{" "}
              (fonte única). Aqui só os parâmetros específicos de emissão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dados puxados de Dados da Empresa (somente leitura) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>CNPJ (de Dados da Empresa)</Label>
                <Input
                  value={companySettings?.company_cnpj || "—"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>Inscrição Estadual (de Dados da Empresa)</Label>
                <Input
                  value={companySettings?.company_ie || "—"}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBuscarCNPJ}
                disabled={cnpjLoading || !companySettings?.company_cnpj}
              >
                {cnpjLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar dados do CNPJ (preenche Município/IBGE)
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="codigo_municipio">
                  Código do Município (IBGE)
                </Label>
                <Input
                  id="codigo_municipio"
                  value={form.codigo_municipio}
                  onChange={(e) => set("codigo_municipio", e.target.value)}
                  placeholder="Ex: 4119152 (Pinhais)"
                />
              </div>
              <div>
                <Label htmlFor="inscricao_municipal">
                  Inscrição Municipal (NFSe)
                </Label>
                <Input
                  id="inscricao_municipal"
                  value={form.inscricao_municipal}
                  onChange={(e) => set("inscricao_municipal", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Regime Tributário</Label>
                <Select
                  value={form.regime_tributario}
                  onValueChange={(v) => set("regime_tributario", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples_nacional">
                      Simples Nacional
                    </SelectItem>
                    <SelectItem value="lucro_presumido">
                      Lucro Presumido
                    </SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    <SelectItem value="mei">MEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="optante_simples" className="cursor-pointer">
                  Optante pelo Simples Nacional
                </Label>
                <Switch
                  id="optante_simples"
                  checked={form.optante_simples_nacional}
                  onCheckedChange={(v) => set("optante_simples_nacional", v)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Serviço & ISS (NFSe) */}
        <Card>
          <CardHeader>
            <CardTitle>Serviço & ISS (NFSe)</CardTitle>
            <CardDescription>
              Parâmetros do serviço prestado para a Nota Fiscal de Serviço.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="codigo_servico">Código do Serviço</Label>
              <Input
                id="codigo_servico"
                value={form.codigo_servico}
                onChange={(e) => set("codigo_servico", e.target.value)}
                placeholder="Ex: 1400201"
              />
            </div>
            <div>
              <Label htmlFor="item_lista_servico">
                Item da Lista de Serviço (LC 116)
              </Label>
              <Input
                id="item_lista_servico"
                value={form.item_lista_servico}
                onChange={(e) => set("item_lista_servico", e.target.value)}
                placeholder="Ex: 14.02"
              />
            </div>
            <div>
              <Label htmlFor="nbs">NBS</Label>
              <Input
                id="nbs"
                value={form.nbs}
                onChange={(e) => set("nbs", e.target.value)}
                placeholder="Ex: 1.2001.60.00"
              />
            </div>
            <div>
              <Label htmlFor="cnae">CNAE</Label>
              <Input
                id="cnae"
                value={form.cnae}
                onChange={(e) => set("cnae", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="aliquota_iss">Alíquota de ISS (%)</Label>
              <Input
                id="aliquota_iss"
                value={form.aliquota_iss}
                onChange={(e) => set("aliquota_iss", e.target.value)}
                placeholder="Ex: 3 ou 5 (confirmar com contador)"
                inputMode="decimal"
              />
            </div>
            <div>
              <Label htmlFor="natureza_operacao">Natureza da Operação</Label>
              <Input
                id="natureza_operacao"
                value={form.natureza_operacao}
                onChange={(e) => set("natureza_operacao", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
              <Label htmlFor="iss_retido" className="cursor-pointer">
                ISS Retido na fonte
              </Label>
              <Switch
                id="iss_retido"
                checked={form.iss_retido}
                onCheckedChange={(v) => set("iss_retido", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Templates de texto */}
        <Card>
          <CardHeader>
            <CardTitle>Discriminação & Observações</CardTitle>
            <CardDescription>
              Textos da nota. Use os marcadores <code>{"{os}"}</code>,{" "}
              <code>{"{oc}"}</code>, <code>{"{equipamento}"}</code> e{" "}
              <code>{"{forma_pagamento}"}</code> — serão substituídos pelos
              dados da OS na emissão. <code>{"{equipamento}"}</code> puxa o
              campo Equipamento da OS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="discriminacao_template">
                Discriminação do serviço
              </Label>
              <Textarea
                id="discriminacao_template"
                value={form.discriminacao_template}
                onChange={(e) => set("discriminacao_template", e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="observacoes_template">
                Observações / Informações complementares
              </Label>
              <Textarea
                id="observacoes_template"
                value={form.observacoes_template}
                onChange={(e) => set("observacoes_template", e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateFiscalSettings.isPending}
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateFiscalSettings.isPending
              ? "Salvando..."
              : "Salvar Configurações Fiscais"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default ConfiguracoesFiscais;
