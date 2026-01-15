import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { PaymentMethod } from "@/hooks/usePaymentMethods";

interface PaymentMethodMobileCardProps {
  paymentMethod: PaymentMethod;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export const PaymentMethodMobileCard = ({
  paymentMethod,
  onEdit,
  onDelete,
  onToggleActive,
}: PaymentMethodMobileCardProps) => {
  return (
    <MobileCard>
      <MobileCardHeader
        title={paymentMethod.name}
        badge={
          <Badge variant={paymentMethod.active ? "default" : "secondary"}>
            {paymentMethod.active ? "Ativo" : "Inativo"}
          </Badge>
        }
      />
      <MobileCardRow
        label="Ordem de exibição"
        value={
          <div className="flex items-center justify-between">
            <span>{paymentMethod.sort_order}</span>
            <Switch
              checked={paymentMethod.active}
              onCheckedChange={onToggleActive}
            />
          </div>
        }
      />
      <MobileCardFooter
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </MobileCard>
  );
};
