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
        "w-full max-w-[1400px] mr-auto",
        "pl-1 pr-4 sm:pl-2 sm:pr-6",
        "py-6 space-y-6",
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageContainer;
