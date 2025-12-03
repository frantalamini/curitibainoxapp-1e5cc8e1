import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { User, Hash, FileText, Cpu } from "lucide-react";

interface Equipment {
  id: string;
  brand: string;
  model: string;
  serial_number?: string | null;
  imei?: string | null;
  notes?: string | null;
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
    <MobileCard onClick={onView}>
      <MobileCardHeader
        title={`${equipment.brand} ${equipment.model}`}
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
            label="Nº Serial"
            value={equipment.serial_number}
          />
        )}
        
        {equipment.imei && (
          <MobileCardRow
            icon={<Cpu className="h-4 w-4" />}
            label="IMEI"
            value={equipment.imei}
          />
        )}
        
        {equipment.notes && (
          <MobileCardRow
            icon={<FileText className="h-4 w-4" />}
            label="Observações"
            value={<span className="line-clamp-2">{equipment.notes}</span>}
          />
        )}
      </div>
      
      <MobileCardFooter
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </MobileCard>
  );
}
