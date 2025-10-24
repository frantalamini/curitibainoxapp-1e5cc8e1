import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { Cadastro } from "@/hooks/useCadastros";

type CadastrosMobileCardProps = {
  cadastro: Cadastro;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
};

export const CadastrosMobileCard = ({
  cadastro,
  isSelected,
  onSelect,
  onEdit,
  onView,
  onDelete,
}: CadastrosMobileCardProps) => {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Selecionar ${cadastro.full_name}`}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{cadastro.full_name}</h3>
                {cadastro.nome_fantasia && (
                  <p className="text-xs text-muted-foreground truncate">{cadastro.nome_fantasia}</p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(cadastro.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(cadastro.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(cadastro.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1 text-sm">
              {cadastro.cpf_cnpj && (
                <p className="text-muted-foreground">
                  <span className="font-medium">CPF/CNPJ:</span> {cadastro.cpf_cnpj}
                </p>
              )}
              {cadastro.city && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Cidade:</span> {cadastro.city}{cadastro.state ? `/${cadastro.state}` : ''}
                </p>
              )}
              <p className="text-muted-foreground">
                <span className="font-medium">Telefone:</span> {cadastro.phone}
              </p>
              {cadastro.email && (
                <p className="text-muted-foreground truncate">
                  <span className="font-medium">Email:</span> {cadastro.email}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Cadastrado em: {new Date(cadastro.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
