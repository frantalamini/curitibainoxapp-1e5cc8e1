import { MobileCard, MobileCardHeader } from "@/components/ui/mobile-card";
import { ActiveBadge } from "@/components/ui/status-badge";
import { ListChecks } from "lucide-react";

interface Checklist {
  id: string;
  name: string;
  description?: string | null;
  items: unknown[];
  active?: boolean | null;
}

interface ChecklistMobileCardProps {
  checklist: Checklist;
  onEdit: () => void;
  onDelete: () => void;
}

export function ChecklistMobileCard({ checklist, onEdit, onDelete }: ChecklistMobileCardProps) {
  const itemCount = Array.isArray(checklist.items) ? checklist.items.length : 0;
  
  return (
    <MobileCard>
      <MobileCardHeader
        title={checklist.name}
        subtitle={checklist.description || undefined}
        badge={<ActiveBadge active={checklist.active ?? true} />}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      <div className="flex items-center gap-2 mt-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </span>
      </div>
    </MobileCard>
  );
}
