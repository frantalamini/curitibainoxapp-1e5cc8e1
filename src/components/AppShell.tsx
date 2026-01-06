import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * AppShell - Global wrapper component for responsive layout
 * 
 * This component wraps the entire application to guarantee:
 * - No horizontal scroll on any screen
 * - Proper width constraints
 * - Safe area support for iOS/Android
 * - Consistent layout across all pages
 * 
 * Any new page automatically inherits these responsive rules.
 */
export const AppShell = ({ children, className }: AppShellProps) => {
  return (
    <div 
      className={cn(
        "app-shell w-full max-w-full min-w-0",
        "min-h-dvh overflow-y-auto",  // Removed overflow-x-hidden - guard rail is at html/body
        className
      )}
    >
      {children}
    </div>
  );
};

export default AppShell;
