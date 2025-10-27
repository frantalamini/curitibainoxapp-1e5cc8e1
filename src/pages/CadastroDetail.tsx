import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Building2, User, X } from "lucide-react";
import { CadastroTipo } from "@/hooks/useCadastros";

export default function CadastroDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateClient } = useClients();
  const { lookupCNPJ, isLoading: cnpjLoading } = useCNPJLookup();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  const { data: cadastro, isLoading } = useQuery({
    queryKey: ['cadastro-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: cadastro || {},
  });

  useEffect(() => {
    if (cadastro) {
      reset(cadastro);
      setOriginalData(cadastro);
    }
  }, [cadastro, reset]);

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

  const handleCancel = () => {
    reset(originalData);
    setIsEditMode(false);
  };

  const handleSave = handleSubmit(async (formData) => {
    try {
      // Remover campos read-only e converter tipos
      const { created_at, updated_at, created_by, id: _id, ...dataToUpdate } = formData;
      
      // Garantir que tipos seja um array válido de CadastroTipo
      if (dataToUpdate.tipos) {
        const validTipos: CadastroTipo[] = ['cliente', 'fornecedor', 'transportador', 'colaborador', 'outro'];
        dataToUpdate.tipos = (dataToUpdate.tipos as string[]).filter(
          (t): t is CadastroTipo => validTipos.includes(t as CadastroTipo)
        );
      }
      
      await updateClient.mutateAsync({ id: id!, ...dataToUpdate } as any);
      setOriginalData(formData);
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['cadastro-detail', id] });
      toast({
        title: "✅ Salvo com sucesso",
        description: "As alterações foram salvas.",
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  });

  const handleCNPJLookup = async () => {
    const cnpj = watch('cpf_cnpj');
    if (!cnpj) return;
    
    const data = await lookupCNPJ(cnpj);
    if (data) {
      setValue('full_name', data.company_name);
      setValue('nome_fantasia', data.trade_name);
      setValue('cep', data.cep);
      setValue('street', data.street);
      setValue('number', data.number);
      setValue('complement', data.complement);
      setValue('neighborhood', data.neighborhood);
      setValue('city', data.city);
      setValue('state', data.state);
      if (data.phone) setValue('phone', data.phone);
      if (data.email) setValue('email', data.email);
      if (data.state_registration) setValue('state_registration', data.state_registration);
    }
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

  const tiposOptions = [
    { value: 'cliente', label: 'Cliente' },
    { value: 'fornecedor', label: 'Fornecedor' },
    { value: 'transportador', label: 'Transportador' },
    { value: 'colaborador', label: 'Colaborador' },
    { value: 'outro', label: 'Outro' },
  ];

  const selectedTipos = watch('tipos') || [];

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
                <h1 className="text-2xl font-bold">
                  {isEditMode ? 'Editar Cadastro' : 'Detalhes do Cadastro'}
                </h1>
                {cadastro && !isEditMode && (
                  <p className="text-sm text-muted-foreground">{cadastro.full_name}</p>
                )}
              </div>
            </div>
            
            {cadastro && !isEditMode && (
              <Button onClick={() => setIsEditMode(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            
            {isEditMode && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar
                </Button>
              </div>
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
            {isEditMode ? (
              /* Modo EDIÇÃO - Form com inputs */
              <form className="space-y-6">
                {/* Card: Informações Básicas - EDIT */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                        <div className="flex gap-2">
                          <Input id="cpf_cnpj" {...register('cpf_cnpj')} placeholder="000.000.000-00" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCNPJLookup}
                            disabled={cnpjLoading}
                          >
                            {cnpjLoading ? 'Buscando...' : 'Buscar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo / Razão Social *</Label>
                      <Input id="full_name" {...register('full_name')} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                      <Input id="nome_fantasia" {...register('nome_fantasia')} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tipo de Cadastro</Label>
                      <div className="flex flex-wrap gap-3">
                        {tiposOptions.map((tipo) => (
                          <div key={tipo.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tipo-${tipo.value}`}
                              checked={(selectedTipos as string[]).includes(tipo.value)}
                              onCheckedChange={(checked) => {
                                const current = (selectedTipos as string[]) || [];
                                if (checked) {
                                  setValue('tipos', [...current, tipo.value] as any);
                                } else {
                                  setValue('tipos', current.filter((t: string) => t !== tipo.value) as any);
                                }
                              }}
                            />
                            <Label htmlFor={`tipo-${tipo.value}`} className="cursor-pointer">
                              {tipo.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card: Contato - EDIT */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone Principal *</Label>
                        <Input id="phone" {...register('phone')} placeholder="(00) 00000-0000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone_2">Telefone Secundário</Label>
                        <Input id="phone_2" {...register('phone_2')} placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" {...register('email')} placeholder="email@exemplo.com" />
                    </div>
                  </CardContent>
                </Card>

                {/* Card: Endereço - EDIT */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Endereço</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <Input id="cep" {...register('cep')} placeholder="00000-000" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Logradouro</Label>
                        <Input id="street" {...register('street')} />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input id="number" {...register('number')} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input id="complement" {...register('complement')} />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input id="neighborhood" {...register('neighborhood')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" {...register('city')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input id="state" {...register('state')} maxLength={2} placeholder="UF" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card: Observações - EDIT */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea {...register('notes')} rows={4} placeholder="Observações adicionais..." />
                  </CardContent>
                </Card>
              </form>
            ) : (
              /* Modo LEITURA - Cards read-only */
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
                      <Separator className="mt-3" />
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
                      <Separator className="mt-3" />
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
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cadastro não encontrado</p>
            <Button onClick={handleBack} className="mt-4" variant="outline">
              Voltar para Lista
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
