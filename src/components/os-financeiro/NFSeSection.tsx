import { useState } from "react";
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
import { FileText, ExternalLink, AlertCircle, Loader2, Ban } from "lucide-react";
import { useFiscalInvoices } from "@/hooks/useFiscalInvoices";

interface NFSeSectionProps {
  serviceCallId: string;
  clientCpfCnpj?: string | null;
  commercialStatusName?: string | null;
}

// Status comerciais nos quais a emissão é liberada (decisão do cliente).
const STATUS_LIBERA_EMISSAO = ["liberado p/ faturamento", "faturado"];

const formatCurrency = (v?: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const hasValidDoc = (doc?: string | null) => {
  const d = (doc || "").replace(/\D/g, "");
  return d.length === 11 || d.length === 14;
};

export const NFSeSection = ({
  serviceCallId,
  clientCpfCnpj,
  commercialStatusName,
}: NFSeSectionProps) => {
  const { nfse, isLoading, emitirNFSe, cancelarNFSe } = useFiscalInvoices(serviceCallId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");

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
              Valor: <b className="text-foreground">{formatCurrency(nfse.valor)}</b>
            </span>
            {nfse.url_danfse && (
              <Button variant="outline" size="sm" asChild>
                <a href={nfse.url_danfse} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" /> Ver PDF
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
            Nota enviada — aguardando autorização da prefeitura. Atualize em instantes.
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
            <span>Preencha o CPF/CNPJ do cliente no cadastro antes de emitir a nota.</span>
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
              O cancelamento é enviado direto à prefeitura. Informe o motivo (mínimo
              15 caracteres). Sujeito às regras de prazo do município.
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
              disabled={justificativa.trim().length < 15 || cancelarNFSe.isPending}
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
              {cancelarNFSe.isPending ? "Cancelando..." : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
