import { MobileCard, MobileCardHeader, MobileCardRow } from "@/components/ui/mobile-card";
import { User, Hash, FileText } from "lucide-react";

interface Equipment {
  id: string;
  brand: string;
  model: string;
  serial_number?: string | null;
  imei?: string | null;
}

interface EquipmentMobileCardProps {
  equipment: Equipment;
  clientName?: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EquipmentMobileCard({ equipment, clientName, onView, onEdit, onDelete }: EquipmentMobileCardProps) {
  return (
    <MobileCard>
      <MobileCardHeader
        title={`${equipment.brand} ${equipment.model}`}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      <div className="space-y-1">
        {clientName && (
          <MobileCardRow
            icon={<User className="h-4 w-4" />}
            label="Cliente"
            value={clientName}
          />
        )}
        
        {equipment.serial_number && (
          <MobileCardRow
            icon={<Hash className="h-4 w-4" />}
            label="Serial"
            value={equipment.serial_number}
          />
        )}
        
        {equipment.imei && (
          <MobileCardRow
            icon={<FileText className="h-4 w-4" />}
            label="IMEI"
            value={equipment.imei}
          />
        )}
      </div>
    </MobileCard>
  );
}
