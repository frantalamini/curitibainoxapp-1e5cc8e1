import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClick?: () => void;
}

const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ className, children, onClick, ...props }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "w-full bg-card rounded-[18px] border border-border/60 p-4 animate-fade-in touch-manipulation",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_12px_-4px_rgba(0,0,0,0.04)]",
        "hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(0,0,0,0.08)]",
        "transition-shadow duration-200",
        onClick && "cursor-pointer active:scale-[0.99]",
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
}

const MobileCardHeader = React.forwardRef<HTMLDivElement, MobileCardHeaderProps>(
  ({ className, title, subtitle, badge, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-start justify-between gap-2 mb-3", className)}
      {...props}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-base text-foreground">{title}</h3>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
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
      className={cn("flex items-start gap-2.5 text-sm py-1.5", className)}
      {...props}
    >
      {icon && <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        {label && <span className="text-muted-foreground text-xs block">{label}</span>}
        <span className="text-foreground">{value}</span>
      </div>
    </div>
  )
);
MobileCardRow.displayName = "MobileCardRow";

interface MobileCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MobileCardFooter = React.forwardRef<HTMLDivElement, MobileCardFooterProps>(
  ({ className, children, onView, onEdit, onDelete, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-4 pt-3 border-t border-border/50", className)}
      {...props}
    >
      {children && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {children}
        </div>
      )}
      
      {(onView || onEdit || onDelete) && (
        <div className="flex items-center gap-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="flex-1 h-9 text-xs font-medium gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver mais
            </Button>
          )}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex-1 h-9 text-xs font-medium gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="h-9 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
);
MobileCardFooter.displayName = "MobileCardFooter";

export { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter };
