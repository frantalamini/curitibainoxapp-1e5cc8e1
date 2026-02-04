import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Trash2, Eye, Receipt, Loader2, Upload, Camera } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTechnicianReimbursements, ReimbursementStatus } from "@/hooks/useTechnicianReimbursements";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OperationalCostsTabProps {
  serviceCallId: string;
  osNumber: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const getStatusBadge = (status: ReimbursementStatus) => {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
    case "APPROVED":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Aprovado</Badge>;
    case "PAID":
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Pago</Badge>;
    case "REJECTED":
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejeitado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function OperationalCostsTab({ serviceCallId, osNumber }: OperationalCostsTabProps) {
  const {
    reimbursements,
    isLoading,
    approveReimbursement,
    rejectReimbursement,
    markAsPaid,
    deleteReimbursement,
    summary,
  } = useTechnicianReimbursements({ serviceCallId });

  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectNotes, setRejectNotes] = useState("");

  const handleApprove = (id: string) => {
    approveReimbursement.mutate({ id });
  };

  const handleReject = () => {
    if (!rejectDialog.id) return;
    rejectReimbursement.mutate({ id: rejectDialog.id, notes: rejectNotes || undefined });
    setRejectDialog({ open: false, id: null });
    setRejectNotes("");
  };

  const handleMarkAsPaid = async () => {
    if (!payDialog.id || !paymentProofFile) {
      toast.error("Anexe o comprovante de pagamento");
      return;
    }

    setIsUploadingProof(true);
    try {
      // Upload payment proof
      const fileName = `payment-proofs/${serviceCallId}/${Date.now()}_${paymentProofFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("service-call-attachments")
        .upload(fileName, paymentProofFile);

      if (uploadError) throw uploadError;

      // Bucket é privado - usar signed URL
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from("service-call-attachments")
        .createSignedUrl(fileName, 604800); // 7 dias

      if (signedUrlError || !urlData) throw signedUrlError;

      await markAsPaid.mutateAsync({
        id: payDialog.id,
        paymentProofUrl: urlData.signedUrl,
      });

      setPayDialog({ open: false, id: null });
      setPaymentProofFile(null);
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Erro ao confirmar pagamento");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este reembolso?")) {
      deleteReimbursement.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Custos Operacionais - OS #{osNumber}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Pendentes</div>
              <div className="text-lg font-bold text-yellow-600">{formatCurrency(summary.totalPending)}</div>
              <div className="text-xs text-muted-foreground">{summary.countPending} item(s)</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Aprovados</div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(summary.totalApproved)}</div>
              <div className="text-xs text-muted-foreground">{summary.countApproved} item(s)</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Pagos</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
              <div className="text-xs text-muted-foreground">{summary.countPaid} item(s)</div>
            </div>
          </div>

          {/* Reimbursements Table */}
          {reimbursements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma solicitação de reembolso para esta OS</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {format(new Date(r.requested_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">{r.technician?.full_name || "-"}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {r.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(r.amount))}
                        {r.ocr_extracted_amount && r.ocr_extracted_amount !== r.amount && (
                          <span className="text-xs text-muted-foreground block">
                            (OCR: {formatCurrency(r.ocr_extracted_amount)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setViewingPhoto(r.receipt_photo_url)}
                            title="Ver comprovante"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {r.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-green-600"
                                onClick={() => handleApprove(r.id)}
                                title="Aprovar"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => setRejectDialog({ open: true, id: r.id })}
                                title="Rejeitar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {r.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => setPayDialog({ open: true, id: r.id })}
                            >
                              Baixar
                            </Button>
                          )}

                          {r.payment_proof_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => setViewingPhoto(r.payment_proof_url!)}
                              title="Ver comprovante de pagamento"
                            >
                              <Receipt className="h-4 w-4 text-green-600" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => handleDelete(r.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprovante</DialogTitle>
          </DialogHeader>
          {viewingPhoto && (
            <img
              src={viewingPhoto}
              alt="Comprovante"
              className="w-full max-h-[70vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog({ open, id: open ? payDialog.id : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Anexe o comprovante de que o reembolso foi realizado ao técnico.
            </p>
            <div>
              <Label>Comprovante de Pagamento *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ open: false, id: null })}>
              Cancelar
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={isUploadingProof || !paymentProofFile}
            >
              {isUploadingProof ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Confirmar Pagamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, id: open ? rejectDialog.id : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Reembolso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da rejeição</Label>
              <Textarea
                placeholder="Informe o motivo..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
