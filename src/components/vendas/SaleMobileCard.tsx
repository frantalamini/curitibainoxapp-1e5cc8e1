import { Sale } from "@/hooks/useSales";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  Copy,
  ShoppingCart,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface SaleMobileCardProps {
  sale: Sale;
  onApprove?: (id: string) => void;
  onCancel?: (id: string) => void;
  onFinalize?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function SaleMobileCard({
  sale,
  onApprove,
  onCancel,
  onFinalize,
  onDuplicate,
}: SaleMobileCardProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">#{sale.sale_number}</span>
            <SaleStatusBadge status={sale.status} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/vendas/${sale.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar
              </DropdownMenuItem>

              {(sale.status === "QUOTE" || sale.status === "APPROVED") && (
                <DropdownMenuItem onClick={() => navigate(`/vendas/${sale.id}/editar`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {sale.status === "QUOTE" && onApprove && (
                <DropdownMenuItem onClick={() => onApprove(sale.id)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-amber-500" />
                  Aprovar
                </DropdownMenuItem>
              )}

              {sale.status === "APPROVED" && onFinalize && (
                <DropdownMenuItem onClick={() => onFinalize(sale.id)}>
                  <ShoppingCart className="mr-2 h-4 w-4 text-green-500" />
                  Finalizar Venda
                </DropdownMenuItem>
              )}

              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(sale.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
              )}

              {(sale.status === "QUOTE" || sale.status === "APPROVED") && onCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCancel(sale.id)}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="font-medium text-foreground truncate">
              {sale.clients?.full_name || "Cliente não encontrado"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(sale.created_at)}</span>
          </div>

          {sale.profiles?.full_name && (
            <div className="text-muted-foreground">
              Vendedor: <span className="text-foreground">{sale.profiles.full_name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          <span className="text-muted-foreground text-sm">Total</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(sale.total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
