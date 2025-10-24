import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { Cadastro } from "@/hooks/useCadastros";

type CadastrosTableProps = {
  cadastros: Cadastro[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  orderBy: 'full_name' | 'created_at';
  orderDirection: 'asc' | 'desc';
  onSort: (field: 'full_name' | 'created_at') => void;
};

export const CadastrosTable = ({
  cadastros,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onView,
  onDelete,
  orderBy,
  orderDirection,
  onSort,
}: CadastrosTableProps) => {
  const allSelected = cadastros.length > 0 && selectedIds.length === cadastros.length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('full_name')}
                className="h-8 px-2 font-semibold"
              >
                Nome
                {orderBy === 'full_name' && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${orderDirection === 'desc' ? 'rotate-180' : ''}`} />
                )}
              </Button>
            </TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('created_at')}
                className="h-8 px-2 font-semibold"
              >
                Data de Cadastro
                {orderBy === 'created_at' && (
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${orderDirection === 'desc' ? 'rotate-180' : ''}`} />
                )}
              </Button>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cadastros.map((cadastro) => (
            <TableRow
              key={cadastro.id}
              className="hover:bg-muted/20 transition-colors"
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(cadastro.id)}
                  onCheckedChange={(checked) => onSelectOne(cadastro.id, checked as boolean)}
                  aria-label={`Selecionar ${cadastro.full_name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{cadastro.full_name}</span>
                  {cadastro.nome_fantasia && (
                    <span className="text-xs text-muted-foreground">{cadastro.nome_fantasia}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">{cadastro.cpf_cnpj || '-'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {cadastro.city ? `${cadastro.city}${cadastro.state ? `/${cadastro.state}` : ''}` : '-'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  <span>{cadastro.phone}</span>
                  {cadastro.email && (
                    <span className="text-xs text-muted-foreground">{cadastro.email}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {new Date(cadastro.created_at).toLocaleDateString('pt-BR')}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
