import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  ExternalLink,
  AlertCircle,
  Loader2,
  Ban,
  Download,
} from "lucide-react";
import { useFiscalInvoices } from "@/hooks/useFiscalInvoices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NFSeSectionProps {
  serviceCallId: string;
  clientCpfCnpj?: string | null;
  commercialStatusName?: string | null;
  clientName?: string | null;
  clientFantasia?: string | null;
  osNumber?: number | null;
}

// Nome do arquivo no mesmo padrão do "PDF Completo": "{cliente} - OS{n} - NFSe.pdf"
const buildPdfFileName = (
  clientName?: string | null,
  clientFantasia?: string | null,
  osNumber?: number | null,
) => {
  const clientPart = clientFantasia
    ? clientFantasia.split(" ").slice(0, 2).join(" ")
    : clientName?.split(" ")[0] || "Cliente";
  return `${clientPart} - OS${osNumber ?? ""} - NFSe.pdf`;
};

// Status comerciais nos quais a emissão é liberada (decisão do cliente).
const STATUS_LIBERA_EMISSAO = ["liberado p/ faturamento", "faturado"];

const formatCurrency = (v?: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v ?? 0,
  );

const hasValidDoc = (doc?: string | null) => {
  const d = (doc || "").replace(/\D/g, "");
  return d.length === 11 || d.length === 14;
};

export const NFSeSection = ({
  serviceCallId,
  clientCpfCnpj,
  commercialStatusName,
  clientName,
  clientFantasia,
  osNumber,
}: NFSeSectionProps) => {
  const { nfse, isLoading, emitirNFSe, cancelarNFSe, consultarStatus } =
    useFiscalInvoices(serviceCallId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [baixando, setBaixando] = useState(false);

  // Baixa o PDF da NFSe pelo app (proxy na edge, sem CORS) já com o nome certo.
  const baixarPdf = async () => {
    try {
      setBaixando(true);
      const { data, error } = await supabase.functions.invoke("emitir-nf", {
        body: {
          action: "baixar_pdf",
          service_call_id: serviceCallId,
          tipo: "nfse",
        },
      });
      if (error) throw error;
      const blob =
        data instanceof Blob
          ? data
          : new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildPdfFileName(clientName, clientFantasia, osNumber);
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível baixar o PDF da nota.");
    } finally {
      setBaixando(false);
    }
  };

  // Enquanto a nota estiver "processando", sincroniza com o provedor a cada
  // 5s (até 10x). Quando autorizar/falhar, o status muda e o intervalo para.
  useEffect(() => {
    if (nfse?.status !== "processando") return;
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      if (!consultarStatus.isPending) consultarStatus.mutate();
      if (tries >= 10) clearInterval(id);
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfse?.status, nfse?.id]);

  const statusOk = STATUS_LIBERA_EMISSAO.includes(
    (commercialStatusName || "").trim().toLowerCase(),
  );
  const docOk = hasValidDoc(clientCpfCnpj);

  const isAutorizada = nfse?.status === "autorizado";
  const isProcessando = nfse?.status === "processando";
  const isErro = nfse?.status === "erro";
  // "Emitir" liberado quando não há nota ativa (sem nota, ou última cancelada/erro)
  const podeEmitir = !isAutorizada && !isProcessando;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Nota Fiscal de Serviço (NFSe)
          {nfse && (
            <Badge
              variant={
                isAutorizada ? "default" : isErro ? "destructive" : "secondary"
              }
              className="ml-1"
            >
              {isAutorizada
                ? `Autorizada${nfse.numero ? ` nº ${nfse.numero}` : ""}`
                : isProcessando
                  ? "Processando"
                  : isErro
                    ? "Erro"
                    : "Cancelada"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Nota autorizada */}
        {isAutorizada && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Valor:{" "}
              <b className="text-foreground">{formatCurrency(nfse.valor)}</b>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={baixarPdf}
              disabled={baixando}
            >
              {baixando ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Baixar PDF
            </Button>
            {nfse.url_danfse && (
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={nfse.url_danfse}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-1" /> Abrir
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <Ban className="w-4 h-4 mr-1" /> Cancelar NFSe
            </Button>
          </div>
        )}

        {/* Em processamento */}
        {isProcessando && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Nota enviada — aguardando autorização da prefeitura. Atualize em
            instantes.
          </p>
        )}

        {/* Erro da última tentativa */}
        {isErro && nfse?.mensagem_erro && (
          <div className="text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{nfse.mensagem_erro}</span>
          </div>
        )}

        {/* Bloqueios antes de emitir */}
        {podeEmitir && !docOk && (
          <div className="text-sm text-amber-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Preencha o CPF/CNPJ do cliente no cadastro antes de emitir a nota.
            </span>
          </div>
        )}
        {podeEmitir && docOk && !statusOk && (
          <div className="text-sm text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              A NFSe pode ser emitida quando a OS estiver em{" "}
              <b>"Liberado P/ Faturamento"</b> ou <b>"Faturado"</b>.
            </span>
          </div>
        )}

        {/* Botão emitir */}
        {podeEmitir && (
          <Button
            onClick={() => emitirNFSe.mutate()}
            disabled={!docOk || !statusOk || emitirNFSe.isPending || isLoading}
          >
            {emitirNFSe.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            {isErro ? "Tentar emitir novamente" : "Emitir NFSe"}
          </Button>
        )}
      </CardContent>

      {/* Dialog de cancelamento (exige justificativa) */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar NFSe</AlertDialogTitle>
            <AlertDialogDescription>
              O cancelamento é enviado direto à prefeitura. Informe o motivo
              (mínimo 15 caracteres). Sujeito às regras de prazo do município.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex.: Nota emitida com valor incorreto, será reemitida."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                justificativa.trim().length < 15 || cancelarNFSe.isPending
              }
              onClick={(e) => {
                e.preventDefault();
                cancelarNFSe.mutate(justificativa.trim(), {
                  onSuccess: () => {
                    setCancelOpen(false);
                    setJustificativa("");
                  },
                });
              }}
            >
              {cancelarNFSe.isPending
                ? "Cancelando..."
                : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
