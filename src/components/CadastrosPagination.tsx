import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CadastrosPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

export const CadastrosPagination = ({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: CadastrosPaginationProps) => {
  // Gerar array de páginas a mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Se tem 7 ou menos páginas, mostra todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sempre mostra primeira página
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Páginas ao redor da atual
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Sempre mostra última página
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      <div className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Página anterior</span>
        </Button>
        
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            );
          }
          
          return (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page as number)}
            >
              {String(page).padStart(2, '0')}
            </Button>
          );
        })}
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Próxima página</span>
        </Button>
      </div>
    </div>
  );
};
