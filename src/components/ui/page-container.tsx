import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageContainer - Standard container for all pages
 * 
 * Guarantees:
 * - No horizontal overflow
 * - Consistent spacing
 * - Proper width constraints
 * - min-width: 0 for flex/grid children
 * 
 * Use this as the root container inside MainLayout for any page.
 */
export const PageContainer = ({ children, className }: PageContainerProps) => {
  return (
    <div 
      className={cn(
        "w-full max-w-full min-w-0 overflow-x-hidden",
        "space-y-4 sm:space-y-6",
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageContainer;
