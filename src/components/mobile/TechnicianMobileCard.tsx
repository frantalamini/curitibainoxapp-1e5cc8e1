import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { ActiveBadge } from "@/components/ui/status-badge";
import { Phone, Hash, Snowflake, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Technician {
  id: string;
  full_name: string;
  phone: string;
  technician_number?: number | null;
  specialty_refrigeration?: boolean | null;
  specialty_cooking?: boolean | null;
  active: boolean;
}

interface TechnicianMobileCardProps {
  technician: Technician;
  onView?: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

export function TechnicianMobileCard({ technician, onView, onEdit, onDelete }: TechnicianMobileCardProps) {
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <MobileCard onClick={onEdit}>
      <MobileCardHeader
        title={technician.full_name}
        subtitle={technician.technician_number ? `Técnico #${String(technician.technician_number).padStart(2, '0')}` : undefined}
        badge={<ActiveBadge active={technician.active} />}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<Phone className="h-4 w-4" />}
          label="Telefone"
          value={formatPhone(technician.phone)}
        />
      </div>
      
      <MobileCardFooter
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        {technician.specialty_refrigeration && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Snowflake className="h-3 w-3" />
            Refrigeração
          </Badge>
        )}
        {technician.specialty_cooking && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Flame className="h-3 w-3" />
            Cocção
          </Badge>
        )}
      </MobileCardFooter>
    </MobileCard>
  );
}
