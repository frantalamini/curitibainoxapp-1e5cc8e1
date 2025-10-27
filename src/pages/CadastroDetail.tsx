import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Building2, User } from "lucide-react";

export default function CadastroDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: cadastro, isLoading } = useQuery({
    queryKey: ['cadastro-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/cadastros/clientes');
    }
    
    setTimeout(() => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.removeProperty('pointer-events');
    }, 100);
  };

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
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header com botões sticky */}
        <div className="sticky top-0 z-20 bg-background pb-4 mb-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Detalhes do Cadastro</h1>
                {cadastro && (
                  <p className="text-sm text-muted-foreground">{cadastro.full_name}</p>
                )}
              </div>
            </div>
            
            {cadastro && (
              <Button onClick={() => navigate(`/cadastros/clientes/${id}/editar`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : cadastro ? (
          <div className="space-y-6">
            {/* Card: Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Nome Completo / Razão Social:</span>
                  <p className="text-sm mt-1">{cadastro.full_name}</p>
                </div>
                {cadastro.nome_fantasia && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Nome Fantasia:</span>
                    <p className="text-sm mt-1">{cadastro.nome_fantasia}</p>
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
              </CardContent>
            </Card>

            {/* Card: Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cadastro.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{cadastro.phone}</span>
                  </div>
                )}
                {cadastro.phone_2 && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{cadastro.phone_2}</span>
                  </div>
                )}
                {cadastro.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{cadastro.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Endereço */}
            {(cadastro.street || cadastro.city || cadastro.cep) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
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
                </CardContent>
              </Card>
            )}

            {/* Card: Documentos */}
            {(cadastro.cpf_cnpj || cadastro.state_registration) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Documentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cadastro.cpf_cnpj && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {cadastro.cpf_cnpj.replace(/\D/g, '').length === 11 ? 'CPF:' : 'CNPJ:'}
                      </span>
                      <p className="text-sm mt-1">{cadastro.cpf_cnpj}</p>
                    </div>
                  )}
                  {cadastro.state_registration && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Inscrição Estadual:</span>
                      <p className="text-sm mt-1">{cadastro.state_registration}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Card: Responsáveis */}
            {(cadastro.responsible_financial || cadastro.responsible_technical || cadastro.responsible_legal) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-muted-foreground" />
                    Responsáveis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cadastro.responsible_financial && (cadastro.responsible_financial as any).name && (
                    <div>
                      <p className="text-sm font-semibold">Responsável Financeiro</p>
                      <p className="text-sm text-muted-foreground mt-1">{(cadastro.responsible_financial as any).name}</p>
                      {(cadastro.responsible_financial as any).phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {(cadastro.responsible_financial as any).phone}
                        </p>
                      )}
                      {(cadastro.responsible_financial as any).email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {(cadastro.responsible_financial as any).email}
                        </p>
                      )}
                    </div>
                  )}
                  {cadastro.responsible_technical && (cadastro.responsible_technical as any).name && (
                    <div>
                      <p className="text-sm font-semibold">Responsável Técnico</p>
                      <p className="text-sm text-muted-foreground mt-1">{(cadastro.responsible_technical as any).name}</p>
                      {(cadastro.responsible_technical as any).phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {(cadastro.responsible_technical as any).phone}
                        </p>
                      )}
                      {(cadastro.responsible_technical as any).email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {(cadastro.responsible_technical as any).email}
                        </p>
                      )}
                    </div>
                  )}
                  {cadastro.responsible_legal && (cadastro.responsible_legal as any).name && (
                    <div>
                      <p className="text-sm font-semibold">Responsável Legal</p>
                      <p className="text-sm text-muted-foreground mt-1">{(cadastro.responsible_legal as any).name}</p>
                      {(cadastro.responsible_legal as any).phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {(cadastro.responsible_legal as any).phone}
                        </p>
                      )}
                      {(cadastro.responsible_legal as any).email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {(cadastro.responsible_legal as any).email}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Card: Observações */}
            {cadastro.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{cadastro.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Cliente não encontrado</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
