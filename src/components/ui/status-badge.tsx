import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  color?: string;
  label: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ color, label, size = "sm", className }: StatusBadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50",
      size === "md" && "px-2.5 py-1.5",
      className
    )}>
      {color && (
        <div 
          className={cn(
            "rounded-sm shrink-0",
            size === "sm" ? "w-3 h-3" : "w-4 h-4"
          )}
          style={{ backgroundColor: color }}
        />
      )}
      <span className={cn(
        "text-foreground truncate",
        size === "sm" ? "text-xs" : "text-sm"
      )}>
        {label}
      </span>
    </div>
  );
}

interface ActiveBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export function ActiveBadge({ 
  active, 
  activeLabel = "Ativo", 
  inactiveLabel = "Inativo",
  className 
}: ActiveBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
      active 
        ? "bg-success/10 text-success" 
        : "bg-destructive/10 text-destructive",
      className
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        active ? "bg-success" : "bg-destructive"
      )} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
