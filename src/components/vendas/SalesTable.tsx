import { Sale } from "@/hooks/useSales";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit, MoreHorizontal, CheckCircle, XCircle, Copy, ShoppingCart, Truck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface SalesTableProps {
  sales: Sale[];
  onApprove?: (id: string) => void;
  onCancel?: (id: string) => void;
  onFinalize?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function SalesTable({
  sales,
  onApprove,
  onCancel,
  onFinalize,
  onDuplicate,
}: SalesTableProps) {
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Nº</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="w-[120px]">Data</TableHead>
            <TableHead className="w-[120px]">Vendedor</TableHead>
            <TableHead className="w-[120px] text-right">Total</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Nenhuma venda encontrada.
              </TableCell>
            </TableRow>
          ) : (
            sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">#{sale.sale_number}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[200px]">
                      {sale.clients?.full_name || "Cliente não encontrado"}
                    </span>
                    {sale.clients?.phone && (
                      <span className="text-xs text-muted-foreground">
                        {sale.clients.phone}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDate(sale.created_at)}</TableCell>
                <TableCell>
                  <span className="truncate max-w-[100px] block">
                    {sale.profiles?.full_name || "-"}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(sale.total)}
                </TableCell>
                <TableCell>
                  <SaleStatusBadge status={sale.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
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
                          Aprovar Orçamento
                        </DropdownMenuItem>
                      )}

                      {sale.status === "APPROVED" && onFinalize && (
                        <DropdownMenuItem onClick={() => onFinalize(sale.id)}>
                          <ShoppingCart className="mr-2 h-4 w-4 text-green-500" />
                          Finalizar Venda
                        </DropdownMenuItem>
                      )}

                      {(sale.status === "SALE" || sale.status === "INVOICED") && (
                        <DropdownMenuItem onClick={() => navigate(`/vendas/entregas`)}>
                          <Truck className="mr-2 h-4 w-4 text-blue-500" />
                          Registrar Entrega
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
