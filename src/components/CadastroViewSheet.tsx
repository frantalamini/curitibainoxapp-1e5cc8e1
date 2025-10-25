import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Phone, Mail, MapPin, FileText, Building2, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type CadastroViewSheetProps = {
  cadastroId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
};

export const CadastroViewSheet = ({ 
  cadastroId, 
  open, 
  onOpenChange,
  onEdit 
}: CadastroViewSheetProps) => {
  const { data: cadastro, isLoading } = useQuery({
    queryKey: ['cadastro', cadastroId],
    queryFn: async () => {
      if (!cadastroId) return null;
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', cadastroId)
        .maybeSingle();
      return data;
    },
    enabled: !!cadastroId && open,
  });

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      cliente: 'Cliente',
      fornecedor: 'Fornecedor',
      transportador: 'Transportador',
      colaborador: 'Colaborador',
      outro: 'Outro',
    };
    return labels[tipo] || tipo;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Visualizar Cadastro</SheetTitle>
            <Button 
              size="sm" 
              onClick={() => {
                if (cadastroId) {
                  onEdit(cadastroId);
                  onOpenChange(false);
                }
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : cadastro ? (
          <div className="mt-6 space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Informações Básicas
              </div>
              <div className="space-y-2 pl-6">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Nome:</span>
                  <p className="text-sm">{cadastro.full_name}</p>
                </div>
                {cadastro.nome_fantasia && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Nome Fantasia:</span>
                    <p className="text-sm">{cadastro.nome_fantasia}</p>
                  </div>
                )}
                {cadastro.tipos && cadastro.tipos.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Tipo de Cadastro:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cadastro.tipos.map((tipo) => (
                        <Badge key={tipo} variant="secondary">
                          {getTipoLabel(tipo)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Contato */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Contato
              </div>
              <div className="space-y-2 pl-6">
                {cadastro.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{cadastro.phone}</span>
                  </div>
                )}
                {cadastro.phone_2 && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{cadastro.phone_2}</span>
                  </div>
                )}
                {cadastro.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{cadastro.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Endereço */}
            {(cadastro.street || cadastro.city) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Endereço
                  </div>
                  <div className="space-y-1 pl-6">
                    {cadastro.street && (
                      <p className="text-sm">
                        {cadastro.street}
                        {cadastro.number && `, ${cadastro.number}`}
                        {cadastro.complement && ` - ${cadastro.complement}`}
                      </p>
                    )}
                    {cadastro.neighborhood && (
                      <p className="text-sm">{cadastro.neighborhood}</p>
                    )}
                    {cadastro.city && (
                      <p className="text-sm">
                        {cadastro.city}{cadastro.state && ` - ${cadastro.state}`}
                      </p>
                    )}
                    {cadastro.cep && (
                      <p className="text-sm text-muted-foreground">CEP: {cadastro.cep}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Documentos */}
            {(cadastro.cpf_cnpj || cadastro.state_registration) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Documentos
                  </div>
                  <div className="space-y-2 pl-6">
                    {cadastro.cpf_cnpj && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {cadastro.cpf_cnpj.length <= 14 ? 'CPF:' : 'CNPJ:'}
                        </span>
                        <p className="text-sm">{cadastro.cpf_cnpj}</p>
                      </div>
                    )}
                    {cadastro.state_registration && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Inscrição Estadual:</span>
                        <p className="text-sm">{cadastro.state_registration}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Responsáveis */}
            {(cadastro.responsible_financial || cadastro.responsible_technical || cadastro.responsible_legal) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Responsáveis
                  </div>
                  <div className="space-y-3 pl-6">
                    {cadastro.responsible_financial && (cadastro.responsible_financial as any).name && (
                      <div>
                        <p className="text-sm font-medium">Financeiro</p>
                        <p className="text-sm text-muted-foreground">{(cadastro.responsible_financial as any).name}</p>
                        {(cadastro.responsible_financial as any).phone && (
                          <p className="text-sm text-muted-foreground">{(cadastro.responsible_financial as any).phone}</p>
                        )}
                      </div>
                    )}
                    {cadastro.responsible_technical && (cadastro.responsible_technical as any).name && (
                      <div>
                        <p className="text-sm font-medium">Técnico</p>
                        <p className="text-sm text-muted-foreground">{(cadastro.responsible_technical as any).name}</p>
                        {(cadastro.responsible_technical as any).phone && (
                          <p className="text-sm text-muted-foreground">{(cadastro.responsible_technical as any).phone}</p>
                        )}
                      </div>
                    )}
                    {cadastro.responsible_legal && (cadastro.responsible_legal as any).name && (
                      <div>
                        <p className="text-sm font-medium">Legal</p>
                        <p className="text-sm text-muted-foreground">{(cadastro.responsible_legal as any).name}</p>
                        {(cadastro.responsible_legal as any).phone && (
                          <p className="text-sm text-muted-foreground">{(cadastro.responsible_legal as any).phone}</p>
                        )}
                        {(cadastro.responsible_legal as any).email && (
                          <p className="text-sm text-muted-foreground">{(cadastro.responsible_legal as any).email}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Observações */}
            {cadastro.notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Observações
                  </div>
                  <p className="text-sm pl-6 whitespace-pre-wrap">{cadastro.notes}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center text-muted-foreground">
            <p>Cadastro não encontrado</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
