import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";
import { ReimbursementRequestModal } from "./ReimbursementRequestModal";

interface TechnicianReimbursementButtonProps {
  serviceCallId: string;
}

/**
 * Button for technicians to request reimbursement for expenses
 * This button is only visible to technicians, not admins
 */
export function TechnicianReimbursementButton({ serviceCallId }: TechnicianReimbursementButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { technicianId, isLoading } = useCurrentTechnician();

  // If loading or no technician, don't show button
  if (isLoading || !technicianId) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Receipt className="h-4 w-4" />
        <span className="hidden sm:inline">Solicitar Reembolso</span>
        <span className="sm:hidden">Reembolso</span>
      </Button>

      <ReimbursementRequestModal
        open={isOpen}
        onOpenChange={setIsOpen}
        serviceCallId={serviceCallId}
        technicianId={technicianId}
      />
    </>
  );
}
