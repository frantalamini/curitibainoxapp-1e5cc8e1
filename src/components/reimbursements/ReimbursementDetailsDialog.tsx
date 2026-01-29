import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, DollarSign, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
