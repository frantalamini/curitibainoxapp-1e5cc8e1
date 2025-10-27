import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import InputMask from "react-input-mask";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { CadastroTipo } from "@/hooks/useCadastros";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, Building2, User, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const clientSchema = z.object({
  full_name: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  tipos: z.array(z.enum(['cliente', 'fornecedor', 'transportador', 'colaborador', 'outro']))
    .min(1, "Selecione ao menos um tipo de cadastro"),
  phone: z.string()
    .trim()
    .min(10, "Telefone deve ter no mínimo 10 dígitos")
    .regex(/^[\d\s()-]+$/, "Telefone deve conter apenas números"),
  phone_2: z.string()
    .trim()
    .regex(/^[\d\s()-]*$/, "Telefone inválido")
    .optional()
    .or(z.literal("")),
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .optional()
    .or(z.literal("")),
  cpf_cnpj: z.string()
    .trim()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length === 11 || digits.length === 14;
    }, "CPF deve ter 11 dígitos ou CNPJ 14 dígitos")
    .or(z.literal("")),
  cep: z.string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .optional()
    .or(z.literal("")),
  street: z.string()
    .trim()
    .max(200, "Rua muito longa")
    .optional()
    .or(z.literal("")),
  number: z.string()
    .trim()
    .max(20, "Número muito longo")
    .optional()
    .or(z.literal("")),
  complement: z.string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform(val => val || ""),
  neighborhood: z.string()
    .trim()
    .max(100, "Bairro muito longo")
    .optional()
    .or(z.literal("")),
  city: z.string()
    .trim()
    .max(100, "Cidade muito longa")
    .optional()
    .or(z.literal("")),
  state: z.string()
    .trim()
    .length(2, "Estado deve ter 2 caracteres")
    .optional()
    .or(z.literal("")),
  state_registration: z.string()
    .trim()
    .max(50, "Inscrição estadual muito longa")
    .optional()
    .or(z.literal("")),
  address: z.string()
    .trim()
    .max(500, "Endereço muito longo")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform(val => val || ""),
  nome_fantasia: z.string()
    .trim()
    .max(100, "Nome fantasia muito longo")
    .optional()
    .or(z.literal("")),
  responsible_financial: z.object({
    name: z.string().optional().nullable().transform(val => val ?? ""),
    phone: z.string().optional().nullable().transform(val => val ?? ""),
    email: z.union([
      z.string().email("Email inválido"),
      z.literal(""),
    ]).optional().nullable().transform(val => val ?? ""),
  }).optional().nullable(),
  responsible_technical: z.object({
    name: z.string().optional().nullable().transform(val => val ?? ""),
    phone: z.string().optional().nullable().transform(val => val ?? ""),
    email: z.union([
      z.string().email("Email inválido"),
      z.literal(""),
    ]).optional().nullable().transform(val => val ?? ""),
  }).optional().nullable(),
  responsible_legal: z.object({
    name: z.string().optional().nullable().transform(val => val ?? ""),
    phone: z.string().optional().nullable().transform(val => val ?? ""),
    email: z.union([
      z.string().email("Email inválido"),
      z.literal(""),
    ]).optional().nullable().transform(val => val ?? ""),
  }).optional().nullable(),
});

export default function CadastroDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateClient } = useClients();
  const { lookupCNPJ, lookupCEP, isLoading: isCNPJLoading } = useCNPJLookup();
  
  const [editMode, setEditMode] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [documentType, setDocumentType] = useState<"CPF" | "CNPJ">("CPF");
  const [documentValue, setDocumentValue] = useState("");

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      tipos: ['cliente'],
      complement: "",
      notes: "",
      phone_2: "",
      responsible_financial: { name: "", phone: "", email: "" },
      responsible_technical: { name: "", phone: "", email: "" },
      responsible_legal: { name: "", phone: "", email: "" },
    },
  });

  useEffect(() => {
    if (cadastro && !initialData) {
      const cleanedData = {
        ...cadastro,
        tipos: cadastro.tipos || ['cliente'],
        phone_2: cadastro.phone_2 || "",
        nome_fantasia: cadastro.nome_fantasia || "",
        complement: cadastro.complement || "",
        notes: cadastro.notes || "",
        responsible_financial: cadastro.responsible_financial || { name: "", phone: "", email: "" },
        responsible_technical: cadastro.responsible_technical || { name: "", phone: "", email: "" },
        responsible_legal: cadastro.responsible_legal || { name: "", phone: "", email: "" },
      };
      setInitialData(cleanedData);
      reset(cleanedData);
      
      if (cadastro.cpf_cnpj) {
        const digits = cadastro.cpf_cnpj.replace(/\D/g, "");
        if (digits.length === 11) {
          setDocumentType("CPF");
        } else if (digits.length === 14) {
          setDocumentType("CNPJ");
        }
        setDocumentValue(cadastro.cpf_cnpj);
      }
    }
  }, [cadastro, initialData, reset]);

  // Limpeza de overlays ao desmontar
  useEffect(() => {
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.removeProperty('pointer-events');
    };
  }, []);

  const handleBack = () => {
    document.body.classList.remove('overflow-hidden');
    document.body.style.removeProperty('pointer-events');
    navigate('/cadastros/clientes');
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

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return String(error.message);
    return '';
  };

  const handleCNPJSearch = async () => {
    const digits = documentValue.replace(/\D/g, "");
    if (digits.length !== 14) return;

    const data = await lookupCNPJ(documentValue);
    if (data) {
      setValue("full_name", data.company_name);
      setValue("cep", data.cep);
      setValue("street", data.street);
      setValue("number", data.number);
      setValue("complement", data.complement);
      setValue("neighborhood", data.neighborhood);
      setValue("city", data.city);
      setValue("state", data.state);
      if (data.state_registration) setValue("state_registration", data.state_registration);
      if (data.phone) setValue("phone", data.phone);
      if (data.email) setValue("email", data.email);
    }
  };

  const handleCEPSearch = async () => {
    const cep = watch("cep");
    if (!cep) return;

    const data = await lookupCEP(cep);
    if (data) {
      if (data.street) setValue("street", data.street);
      if (data.neighborhood) setValue("neighborhood", data.neighborhood);
      if (data.city) setValue("city", data.city);
      if (data.state) setValue("state", data.state);
    }
  };

  const onValid = async (payload: any) => {
    console.log('🔵 onValid iniciado', { payload, id });
    
    try {
      const normalizedPayload = {
        id,
        ...payload,
        tipos: Array.isArray(payload.tipos) && payload.tipos.length > 0 ? payload.tipos : ['cliente'],
        complement: payload.complement || "",
        notes: payload.notes || "",
        phone_2: payload.phone_2 || "",
        email: payload.email || "",
        cpf_cnpj: payload.cpf_cnpj || "",
        cep: payload.cep || "",
        street: payload.street || "",
        number: payload.number || "",
        neighborhood: payload.neighborhood || "",
        city: payload.city || "",
        state: payload.state || "",
        state_registration: payload.state_registration || "",
        address: payload.address || "",
        nome_fantasia: payload.nome_fantasia || "",
        responsible_financial: payload.responsible_financial?.name ? payload.responsible_financial : null,
        responsible_technical: payload.responsible_technical?.name ? payload.responsible_technical : null,
        responsible_legal: payload.responsible_legal?.name ? payload.responsible_legal : null,
      };

      console.log('🔵 Payload normalizado', normalizedPayload);
      
      const result = await updateClient.mutateAsync(normalizedPayload);
      console.log('✅ Update concluído', result);
      
      await queryClient.invalidateQueries({ queryKey: ['cadastro-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      console.log('✅ Queries invalidadas');
      
      setEditMode(false);
      navigate(`/cadastros/clientes/${id}`, { replace: true });
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <form id="formCliente" onSubmit={handleSubmit(onValid)}>
          {/* Header com botões sticky */}
          <div className="sticky top-0 z-20 bg-background pb-4 mb-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack} type="button">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">
                    {editMode ? "Editando Cadastro" : "Detalhes do Cadastro"}
                  </h1>
                  {cadastro && !editMode && (
                    <p className="text-sm text-muted-foreground">{cadastro.full_name}</p>
                  )}
                </div>
              </div>
              
              {cadastro && !editMode && (
                <Button onClick={() => setEditMode(true)} type="button">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              
              {editMode && (
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      reset(initialData);
                      setEditMode(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" form="formCliente">
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
            {/* Card: Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo / Razão Social *</Label>
                      <Input id="full_name" {...register("full_name")} />
                      {errors.full_name && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.full_name)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                      <Input id="nome_fantasia" {...register("nome_fantasia")} />
                      {errors.nome_fantasia && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.nome_fantasia)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Cadastro *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start h-auto min-h-[40px] py-2"
                            type="button"
                          >
                            {(watch("tipos") as CadastroTipo[])?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(watch("tipos") as CadastroTipo[]).map((tipo: CadastroTipo) => (
                                  <Badge key={tipo} variant="secondary">
                                    {getTipoLabel(tipo)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Selecione...</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px]">
                          <div className="space-y-2">
                            {(['cliente', 'fornecedor', 'transportador', 'colaborador', 'outro'] as CadastroTipo[]).map((tipo) => (
                              <div key={tipo} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`tipo-${tipo}`}
                                  checked={(watch("tipos") as CadastroTipo[])?.includes(tipo)}
                                  onCheckedChange={(checked) => {
                                    const current = (watch("tipos") as CadastroTipo[]) || [];
                                    if (checked) {
                                      setValue("tipos", [...current, tipo]);
                                    } else {
                                      setValue("tipos", current.filter(t => t !== tipo));
                                    }
                                  }}
                                />
                                <Label htmlFor={`tipo-${tipo}`} className="font-normal cursor-pointer">
                                  {getTipoLabel(tipo)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {errors.tipos && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.tipos)}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card: Documentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cpf_cnpj">{documentType === "CPF" ? "CPF" : "CNPJ"}</Label>
                      <div className="flex gap-2">
                        <InputMask
                          mask={documentType === "CPF" ? "999.999.999-99" : "99.999.999/9999-99"}
                          value={documentValue}
                          onChange={(e) => {
                            setDocumentValue(e.target.value);
                            setValue("cpf_cnpj", e.target.value);
                          }}
                        >
                          {(inputProps: any) => (
                            <Input
                              {...inputProps}
                              id="cpf_cnpj"
                              placeholder={
                                documentType === "CPF" 
                                  ? "000.000.000-00" 
                                  : "00.000.000/0000-00"
                              }
                              className="flex-1"
                            />
                          )}
                        </InputMask>
                        {documentType === "CNPJ" && (
                          <Button
                            type="button"
                            onClick={handleCNPJSearch}
                            disabled={isCNPJLoading || documentValue.replace(/\D/g, "").length !== 14}
                            variant="secondary"
                          >
                            {isCNPJLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      {errors.cpf_cnpj && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.cpf_cnpj)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state_registration">Inscrição Estadual</Label>
                      <Input id="state_registration" {...register("state_registration")} />
                      {errors.state_registration && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.state_registration)}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
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
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <InputMask
                        mask="(99) 99999-9999"
                        value={watch("phone") || ""}
                        onChange={(e) => setValue("phone", e.target.value)}
                      >
                        {(inputProps: any) => (
                          <Input
                            {...inputProps}
                            id="phone"
                            placeholder="(00) 00000-0000"
                          />
                        )}
                      </InputMask>
                      {errors.phone && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.phone)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_2">Telefone 2</Label>
                      <InputMask
                        mask="(99) 99999-9999"
                        value={watch("phone_2") || ""}
                        onChange={(e) => setValue("phone_2", e.target.value)}
                      >
                        {(inputProps: any) => (
                          <Input
                            {...inputProps}
                            id="phone_2"
                            placeholder="(00) 00000-0000"
                          />
                        )}
                      </InputMask>
                      {errors.phone_2 && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.phone_2)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.email)}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card: Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <div className="flex gap-2">
                        <InputMask
                          mask="99999-999"
                          value={watch("cep") || ""}
                          onChange={(e) => setValue("cep", e.target.value)}
                        >
                          {(inputProps: any) => (
                            <Input
                              {...inputProps}
                              id="cep"
                              placeholder="00000-000"
                            />
                          )}
                        </InputMask>
                        <Button
                          type="button"
                          onClick={handleCEPSearch}
                          disabled={isCNPJLoading || !watch("cep")}
                          variant="secondary"
                        >
                          {isCNPJLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.cep && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.cep)}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-1">
                        <Label htmlFor="street">Rua</Label>
                        <Input id="street" {...register("street")} />
                        {errors.street && (
                          <p className="text-sm text-destructive">{getErrorMessage(errors.street)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input id="number" {...register("number")} />
                        {errors.number && (
                          <p className="text-sm text-destructive">{getErrorMessage(errors.number)}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input id="complement" {...register("complement")} />
                      {errors.complement && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.complement)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input id="neighborhood" {...register("neighborhood")} />
                      {errors.neighborhood && (
                        <p className="text-sm text-destructive">{getErrorMessage(errors.neighborhood)}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" {...register("city")} />
                        {errors.city && (
                          <p className="text-sm text-destructive">{getErrorMessage(errors.city)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado (UF)</Label>
                        <Input id="state" {...register("state")} maxLength={2} />
                        {errors.state && (
                          <p className="text-sm text-destructive">{getErrorMessage(errors.state)}</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card: Responsáveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Responsáveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    {/* Responsável Financeiro */}
                    <div className="space-y-2 border-b pb-4">
                      <p className="text-sm font-semibold">Responsável Financeiro</p>
                      <div className="space-y-2">
                        <Label htmlFor="resp_fin_name">Nome</Label>
                        <Input id="resp_fin_name" {...register("responsible_financial.name")} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="resp_fin_phone">Telefone</Label>
                          <Input id="resp_fin_phone" {...register("responsible_financial.phone")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resp_fin_email">E-mail</Label>
                          <Input id="resp_fin_email" type="email" {...register("responsible_financial.email")} />
                        </div>
                      </div>
                    </div>

                    {/* Responsável Técnico */}
                    <div className="space-y-2 border-b pb-4">
                      <p className="text-sm font-semibold">Responsável Técnico</p>
                      <div className="space-y-2">
                        <Label htmlFor="resp_tec_name">Nome</Label>
                        <Input id="resp_tec_name" {...register("responsible_technical.name")} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="resp_tec_phone">Telefone</Label>
                          <Input id="resp_tec_phone" {...register("responsible_technical.phone")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resp_tec_email">E-mail</Label>
                          <Input id="resp_tec_email" type="email" {...register("responsible_technical.email")} />
                        </div>
                      </div>
                    </div>

                    {/* Responsável Legal */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Responsável Legal</p>
                      <div className="space-y-2">
                        <Label htmlFor="resp_leg_name">Nome</Label>
                        <Input id="resp_leg_name" {...register("responsible_legal.name")} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="resp_leg_phone">Telefone</Label>
                          <Input id="resp_leg_phone" {...register("responsible_legal.phone")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resp_leg_email">E-mail</Label>
                          <Input id="resp_leg_email" type="email" {...register("responsible_legal.email")} />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card: Observações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea id="notes" {...register("notes")} rows={4} />
                    {errors.notes && (
                      <p className="text-sm text-destructive">{getErrorMessage(errors.notes)}</p>
                    )}
                  </div>
                ) : (
                  cadastro.notes && (
                    <p className="text-sm whitespace-pre-wrap">{cadastro.notes}</p>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">Cliente não encontrado</p>
          </div>
        )}
        </form>
      </div>
    </MainLayout>
  );
}
