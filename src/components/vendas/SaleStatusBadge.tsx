import { cn } from "@/lib/utils";
import { SaleStatus } from "@/hooks/useSales";

interface SaleStatusBadgeProps {
  status: SaleStatus;
  className?: string;
}

const statusConfig: Record<SaleStatus, { label: string; className: string }> = {
  QUOTE: {
    label: "Orçamento",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  APPROVED: {
    label: "Aprovado",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  SALE: {
    label: "Venda",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  INVOICED: {
    label: "Faturado",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

export function SaleStatusBadge({ status, className }: SaleStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.QUOTE;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
