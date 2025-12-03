import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "card-mobile animate-fade-in touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
MobileCard.displayName = "MobileCard";

interface MobileCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MobileCardHeader = React.forwardRef<HTMLDivElement, MobileCardHeaderProps>(
  ({ className, title, subtitle, badge, onView, onEdit, onDelete, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-start justify-between gap-2 mb-3", className)}
      {...props}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      
      {(onView || onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
);
MobileCardHeader.displayName = "MobileCardHeader";

interface MobileCardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  label?: string;
  value: React.ReactNode;
}

const MobileCardRow = React.forwardRef<HTMLDivElement, MobileCardRowProps>(
  ({ className, icon, label, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 text-sm py-1", className)}
      {...props}
    >
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      {label && <span className="text-muted-foreground shrink-0">{label}:</span>}
      <span className="text-foreground truncate">{value}</span>
    </div>
  )
);
MobileCardRow.displayName = "MobileCardRow";

interface MobileCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const MobileCardFooter = React.forwardRef<HTMLDivElement, MobileCardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border", className)}
      {...props}
    >
      {children}
    </div>
  )
);
MobileCardFooter.displayName = "MobileCardFooter";

export { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter };
