import { FileX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type CadastrosEmptyStateProps = {
  type: 'no-data' | 'no-results';
  searchTerm?: string;
  onReset?: () => void;
};

export const CadastrosEmptyState = ({ type, searchTerm, onReset }: CadastrosEmptyStateProps) => {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Search className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          {searchTerm 
            ? `Não encontramos nenhum cadastro para "${searchTerm}".`
            : 'Não encontramos nenhum cadastro com os filtros aplicados.'}
        </p>
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            Limpar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileX className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhum cadastro encontrado</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Você ainda não possui nenhum cadastro. Clique no botão "Incluir Cadastro" para começar.
      </p>
    </div>
  );
};
