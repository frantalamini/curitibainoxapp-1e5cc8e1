import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  showBackButton?: boolean;
  backTo?: string;
  children?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  actionLabel, 
  onAction, 
  showBackButton = false,
  backTo,
  children 
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => backTo ? navigate(backTo) : navigate(-1)}
            className="h-9 w-9 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
