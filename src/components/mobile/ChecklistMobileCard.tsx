import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { ActiveBadge } from "@/components/ui/status-badge";
import { ListChecks, FileText } from "lucide-react";

interface Checklist {
  id: string;
  name: string;
  description?: string | null;
  items: unknown[];
  active?: boolean | null;
}

interface ChecklistMobileCardProps {
  checklist: Checklist;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ChecklistMobileCard({ checklist, onView, onEdit, onDelete }: ChecklistMobileCardProps) {
  const itemCount = Array.isArray(checklist.items) ? checklist.items.length : 0;
  
  return (
    <MobileCard onClick={onEdit}>
      <MobileCardHeader
        title={checklist.name}
        subtitle={checklist.description || undefined}
        badge={<ActiveBadge active={checklist.active ?? true} />}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<ListChecks className="h-4 w-4" />}
          label="Itens"
          value={`${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
        />
      </div>
      
      <MobileCardFooter
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </MobileCard>
  );
}
