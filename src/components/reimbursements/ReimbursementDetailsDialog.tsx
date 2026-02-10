import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, DollarSign, ExternalLink, Loader2, Upload, Camera } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/hooks/useUserRole";
import { useTechnicianReimbursements } from "@/hooks/useTechnicianReimbursements";
import { toast } from "sonner";

interface ReimbursementDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reimbursementId: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  PENDING: { label: "Pendente", variant: "secondary", icon: Clock },
  APPROVED: { label: "Aprovado", variant: "default", icon: CheckCircle },
  PAID: { label: "Pago", variant: "default", icon: DollarSign },
  REJECTED: { label: "Rejeitado", variant: "destructive", icon: XCircle },
};

export function ReimbursementDetailsDialog({
  open,
  onOpenChange,
  reimbursementId,
}: ReimbursementDetailsDialogProps) {
  const { isAdmin } = useUserRole();
  const { approveReimbursement, rejectReimbursement, markAsPaid } = useTechnicianReimbursements();

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showPayForm, setShowPayForm] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ amount: number; matches: boolean } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: reimbursement, isLoading } = useQuery({
    queryKey: ["reimbursement-details", reimbursementId],
    queryFn: async () => {
      if (!reimbursementId) return null;
      
      const { data, error } = await supabase
        .from("technician_reimbursements")
        .select(`
          *,
          service_calls (
            os_number,
            equipment_description,
            clients (
              full_name
            )
          )
        `)
        .eq("id", reimbursementId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!reimbursementId,
  });

  const status = reimbursement ? (statusConfig[reimbursement.status] || statusConfig.PENDING) : statusConfig.PENDING;
  const StatusIcon = status.icon;

  const handleApprove = () => {
    if (!reimbursementId) return;
    approveReimbursement.mutate({ id: reimbursementId });
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!reimbursementId) return;
    rejectReimbursement.mutate({ id: reimbursementId, notes: rejectNotes || undefined });
    setShowRejectForm(false);
    setRejectNotes("");
    onOpenChange(false);
  };

  const handlePaymentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reimbursement) return;
    setPaymentProofFile(file);
    
    // Run OCR on payment proof
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const { data, error } = await supabase.functions.invoke("extract-receipt-amount", {
          body: { imageBase64: base64 }
        });

        if (!error && data?.success && data?.data?.amount) {
          const extractedAmount = data.data.amount;
          const matches = Math.abs(extractedAmount - Number(reimbursement.amount)) < 0.01;
          setOcrResult({ amount: extractedAmount, matches });
          if (matches) {
            toast.success(`Valor do comprovante (R$ ${extractedAmount.toFixed(2).replace(".", ",")}) confere com o reembolso!`);
          } else {
            toast.warning(`Valor do comprovante: R$ ${extractedAmount.toFixed(2).replace(".", ",")} — diverge do reembolso (R$ ${Number(reimbursement.amount).toFixed(2).replace(".", ",")})`);
          }
        } else {
          toast.info("Não foi possível ler o valor do comprovante automaticamente.");
          setOcrResult(null);
        }
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsExtracting(false);
      setOcrResult(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!reimbursementId || !paymentProofFile || !reimbursement) return;

    setIsUploadingProof(true);
    try {
      const scId = reimbursement.service_call_id;
      const fileName = `payment-proofs/${scId}/${Date.now()}_${paymentProofFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("service-call-attachments")
        .upload(fileName, paymentProofFile);

      if (uploadError) throw uploadError;

      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from("service-call-attachments")
        .createSignedUrl(fileName, 604800);

      if (signedUrlError || !urlData) throw signedUrlError;

      await markAsPaid.mutateAsync({
        id: reimbursementId,
        paymentProofUrl: urlData.signedUrl,
      });

      setShowPayForm(false);
      setPaymentProofFile(null);
      setOcrResult(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Erro ao confirmar pagamento");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const resetState = () => {
    setShowRejectForm(false);
    setShowPayForm(false);
    setRejectNotes("");
    setPaymentProofFile(null);
    setOcrResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Reembolso</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : reimbursement ? (
          <div className="space-y-4 py-2">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={status.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>

            {/* Valor */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor</span>
              <span className="text-xl font-bold text-primary">
                R$ {reimbursement.amount.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {/* OS */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">OS</span>
              <span className="font-medium">
                #{reimbursement.service_calls?.os_number}
              </span>
            </div>

            {/* Cliente */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cliente</span>
              <span className="text-sm">
                {reimbursement.service_calls?.clients?.full_name}
              </span>
            </div>

            {/* Equipamento */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Equipamento</span>
              <span className="text-sm truncate max-w-[200px]">
                {reimbursement.service_calls?.equipment_description}
              </span>
            </div>

            {/* Descrição */}
            {reimbursement.description && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Descrição</span>
                <p className="text-sm bg-muted p-2 rounded">
                  {reimbursement.description}
                </p>
              </div>
            )}

            {/* Foto do comprovante */}
            <div>
              <span className="text-sm text-muted-foreground block mb-1">Comprovante</span>
              <img
                src={reimbursement.receipt_photo_url}
                alt="Comprovante"
                className="w-full max-h-64 object-contain rounded-md border cursor-pointer"
                onClick={() => window.open(reimbursement.receipt_photo_url, "_blank")}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 w-full"
                onClick={() => window.open(reimbursement.receipt_photo_url, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Button>
            </div>

            {/* Datas */}
            <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                Solicitado em: {format(new Date(reimbursement.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              {reimbursement.approved_at && (
                <p>
                  Aprovado em: {format(new Date(reimbursement.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
              {reimbursement.paid_at && (
                <p>
                  Pago em: {format(new Date(reimbursement.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* Observações admin */}
            {reimbursement.notes && (
              <div className="border-t pt-4">
                <span className="text-sm text-muted-foreground block mb-1">Observações</span>
                <p className="text-sm bg-muted p-2 rounded">
                  {reimbursement.notes}
                </p>
              </div>
            )}

            {/* Comprovante de pagamento */}
            {reimbursement.payment_proof_url && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Comprovante de Pagamento</span>
                <img
                  src={reimbursement.payment_proof_url}
                  alt="Comprovante de Pagamento"
                  className="w-full max-h-48 object-contain rounded-md border cursor-pointer"
                  onClick={() => window.open(reimbursement.payment_proof_url!, "_blank")}
                />
              </div>
            )}

            {/* Admin Actions */}
            {isAdmin && !showRejectForm && !showPayForm && (
              <div className="border-t pt-4 space-y-2">
                {reimbursement.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleApprove} disabled={approveReimbursement.isPending}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => setShowRejectForm(true)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                )}
                {reimbursement.status === "APPROVED" && (
                  <Button className="w-full" onClick={() => setShowPayForm(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Dar Baixa (Anexar Comprovante)
                  </Button>
                )}
              </div>
            )}

            {/* Reject form */}
            {isAdmin && showRejectForm && (
              <div className="border-t pt-4 space-y-3">
                <Label>Motivo da rejeição</Label>
                <Textarea
                  placeholder="Informe o motivo..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowRejectForm(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleReject} disabled={rejectReimbursement.isPending}>
                    Confirmar Rejeição
                  </Button>
                </div>
              </div>
            )}

            {/* Pay form with OCR */}
            {isAdmin && showPayForm && (
              <div className="border-t pt-4 space-y-3">
                <Label>Comprovante de Pagamento *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePaymentFileSelect}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Tirar Foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture");
                        fileInputRef.current.click();
                        fileInputRef.current.setAttribute("capture", "environment");
                      }
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Galeria
                  </Button>
                </div>

                {paymentProofFile && (
                  <div className="text-sm text-muted-foreground">
                    📎 {paymentProofFile.name}
                  </div>
                )}

                {isExtracting && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Lendo valor do comprovante via OCR...
                  </div>
                )}

                {ocrResult && (
                  <div className={`text-sm p-2 rounded ${ocrResult.matches ? "bg-green-500/10 text-green-700" : "bg-yellow-500/10 text-yellow-700"}`}>
                    {ocrResult.matches
                      ? `✅ Valor confere: R$ ${ocrResult.amount.toFixed(2).replace(".", ",")}`
                      : `⚠️ Valor divergente: R$ ${ocrResult.amount.toFixed(2).replace(".", ",")} (esperado: R$ ${Number(reimbursement.amount).toFixed(2).replace(".", ",")})`
                    }
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowPayForm(false); setPaymentProofFile(null); setOcrResult(null); }}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleMarkAsPaid}
                    disabled={isUploadingProof || !paymentProofFile}
                  >
                    {isUploadingProof ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                    ) : (
                      "Confirmar Pagamento"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
