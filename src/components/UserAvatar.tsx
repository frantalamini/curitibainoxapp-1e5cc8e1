import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UserAvatarProps {
  initial: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

/**
 * Avatar circular com a inicial do usuário.
 * Inspirado no design do Tiny/Olist.
 */
export const UserAvatar = ({
  initial,
  name,
  size = "md",
  className,
  showTooltip = true,
}: UserAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  const avatar = (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold",
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );

  if (!showTooltip || !name) {
    return avatar;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {avatar}
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{name}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default UserAvatar;
