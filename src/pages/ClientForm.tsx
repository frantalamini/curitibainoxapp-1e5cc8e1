import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import InputMask from "react-input-mask";
import { useClients, type ClientInsert } from "@/hooks/useClients";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Search, Loader2, DollarSign, Wrench, Scale } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { CadastroTipo } from "@/hooks/useCadastros";

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
  
  // Campos de endereço detalhado
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
    .optional()
    .nullable()
    .transform(val => val ?? ""),
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
    .or(z.literal("")), // Legacy
  notes: z.string()
    .optional()
    .nullable()
    .transform(val => val ?? ""),
  nome_fantasia: z.string()
    .trim()
    .max(100, "Nome fantasia muito longo")
    .optional()
    .or(z.literal("")),
  
  // Responsáveis no estabelecimento
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

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients, createClient, updateClient } = useClients();
  const { lookupCNPJ, lookupCEP, isLoading } = useCNPJLookup();
  const isEdit = !!id;
  const [documentType, setDocumentType] = useState<"CPF" | "CNPJ">("CPF");
  const [documentValue, setDocumentValue] = useState("");
  const { toast } = useToast();

  // Helper para extrair mensagens de erro type-safe
  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return String(error.message);
    return '';
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      tipos: ['cliente'],
      complement: "",
      notes: "",
      responsible_financial: { name: "", phone: "", email: "" },
      responsible_technical: { name: "", phone: "", email: "" },
      responsible_legal: { name: "", phone: "", email: "" },
    },
  });

  // Limpeza de overlays ao desmontar
  useEffect(() => {
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.removeProperty('pointer-events');
    };
  }, []);

  useEffect(() => {
    if (isEdit && clients) {
      const client = clients.find((c) => c.id === id);
      if (client) {
        // Converter null para objeto vazio antes de fazer reset
        const clientData = {
          ...client,
          tipos: client.tipos || ['cliente'],
          phone_2: client.phone_2 || "",
          nome_fantasia: client.nome_fantasia || "",
          complement: client.complement || "",
          notes: client.notes || "",
          responsible_financial: client.responsible_financial || { name: "", phone: "", email: "" },
          responsible_technical: client.responsible_technical || { name: "", phone: "", email: "" },
          responsible_legal: client.responsible_legal || { name: "", phone: "", email: "" },
        };
        reset(clientData as any);
        
        if (client.cpf_cnpj) {
          const digits = client.cpf_cnpj.replace(/\D/g, "");
          if (digits.length === 11) {
            setDocumentType("CPF");
          } else if (digits.length === 14) {
            setDocumentType("CNPJ");
          }
          setDocumentValue(client.cpf_cnpj);
        }
      }
    } else if (!isEdit) {
      // Definir valores padrão para novo cadastro
      reset({
        tipos: ['cliente'],
        complement: "",
        notes: "",
        responsible_financial: { name: "", phone: "", email: "" },
        responsible_technical: { name: "", phone: "", email: "" },
        responsible_legal: { name: "", phone: "", email: "" },
      } as any);
    }
  }, [id, clients, reset, isEdit]);

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
      if (data.state_registration) {
        setValue("state_registration", data.state_registration);
      }
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

  const cleanEmptyObjects = (data: any): any => {
    const cleaned = { ...data };
    
    // Limpar responsible_financial se estiver vazio
    if (cleaned.responsible_financial) {
      const hasFinancialData = cleaned.responsible_financial.name || cleaned.responsible_financial.phone || cleaned.responsible_financial.email;
      if (!hasFinancialData) {
        cleaned.responsible_financial = null;
      }
    }
    
    // Limpar responsible_technical se estiver vazio
    if (cleaned.responsible_technical) {
      const hasTechnicalData = cleaned.responsible_technical.name || cleaned.responsible_technical.phone || cleaned.responsible_technical.email;
      if (!hasTechnicalData) {
        cleaned.responsible_technical = null;
      }
    }
    
    // Limpar responsible_legal se estiver vazio
    if (cleaned.responsible_legal) {
      const hasLegalData = cleaned.responsible_legal.name || cleaned.responsible_legal.phone || cleaned.responsible_legal.email;
      if (!hasLegalData) {
        cleaned.responsible_legal = null;
      }
    }
    
    return cleaned;
  };

  const onValid = async (formData: any) => {
    try {
      const data = cleanEmptyObjects(formData);
      
      if (isEdit) {
        await updateClient.mutateAsync({ id: id!, ...data });
        toast({
          title: "✅ Cadastro Atualizado",
          description: "As alterações foram salvas com sucesso!",
        });
        navigate(`/cadastros/clientes/${id}`);
      } else {
        const newClient = await createClient.mutateAsync(data);
        toast({
          title: "✅ Cadastro Criado",
          description: "Novo cadastro criado com sucesso!",
        });
        navigate(`/cadastros/clientes/${newClient.id}`);
      }
    } catch (error) {
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar os dados. Tente novamente.",
        variant: "destructive",
      });
      console.error("Erro ao salvar:", error);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate(`/cadastros/clientes/${id}`);
    } else {
      navigate('/cadastros/clientes');
    }
  };


  return (
    <MainLayout>
      <div className="max-w-2xl space-y-6">
        <form onSubmit={handleSubmit(onValid)} className="space-y-6">
          {/* Header sticky com botões no topo - DENTRO do form */}
          <div className="sticky top-0 z-20 bg-background pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleCancel} type="button">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">
                  {isEdit ? "Editar Cadastro" : "Novo Cadastro"}
                </h1>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-card p-6 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo / Razão Social *</Label>
            <Input
              id="full_name"
              {...register("full_name", { required: "Nome é obrigatório" })}
              placeholder="Digite o nome completo ou razão social"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.full_name)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input
              id="nome_fantasia"
              {...register("nome_fantasia")}
              placeholder="Nome fantasia (opcional)"
            />
            {errors.nome_fantasia && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.nome_fantasia)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <RadioGroup 
              value={documentType} 
              onValueChange={(value) => {
                setDocumentType(value as "CPF" | "CNPJ");
                setDocumentValue("");
                setValue("cpf_cnpj", "");
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CPF" id="cpf" />
                <Label htmlFor="cpf" className="font-normal cursor-pointer">CPF (Pessoa Física)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CNPJ" id="cnpj" />
                <Label htmlFor="cnpj" className="font-normal cursor-pointer">CNPJ (Pessoa Jurídica)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="cpf_cnpj">
                {documentType === "CPF" ? "CPF" : "CNPJ"} *
              </Label>
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
                    disabled={isLoading || documentValue.replace(/\D/g, "").length !== 14}
                    variant="secondary"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Buscar CNPJ</span>
                  </Button>
                )}
              </div>
              {errors.cpf_cnpj && (
                <p className="text-sm text-destructive">{getErrorMessage(errors.cpf_cnpj)}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Tipo de Cadastro *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto min-h-[40px] py-2"
                  >
                    {(watch("tipos") as CadastroTipo[])?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(watch("tipos") as CadastroTipo[]).map((tipo: CadastroTipo) => (
                          <Badge key={tipo} variant="secondary">
                            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
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
                          {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
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

            {documentType === "CNPJ" && (
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="state_registration">Inscrição Estadual</Label>
                <Input
                  id="state_registration"
                  {...register("state_registration")}
                  placeholder="Preenchido automaticamente"
                />
                <p className="text-xs text-muted-foreground">
                  Buscado automaticamente via CNPJ
                </p>
                {errors.state_registration && (
                  <p className="text-sm text-destructive">{getErrorMessage(errors.state_registration)}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone 1 *</Label>
              <InputMask
                mask={
                  (() => {
                    const phoneDigits = (watch("phone") || "").replace(/\D/g, "");
                    // Se tem 11 dígitos OU o 3º dígito é 9, usa máscara de celular
                    return phoneDigits.length >= 11 || phoneDigits.charAt(2) === '9'
                      ? "(99) 99999-9999"  // Celular
                      : "(99) 9999-9999";   // Fixo
                  })()
                }
                maskChar={null}
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
                mask={
                  (() => {
                    const phoneDigits = ((watch("phone_2") as string) || "").replace(/\D/g, "");
                    return phoneDigits.length >= 11 || phoneDigits.charAt(2) === '9'
                      ? "(99) 99999-9999"
                      : "(99) 9999-9999";
                  })()
                }
                maskChar={null}
                value={(watch("phone_2") as string) || ""}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.email)}</p>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Endereço</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    {...register("cep")}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {errors.cep && (
                    <p className="text-sm text-destructive">{getErrorMessage(errors.cep)}</p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleCEPSearch}
                    disabled={isLoading || !watch("cep")}
                    variant="secondary"
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Buscar CEP
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="street">Rua/Logradouro</Label>
                  <Input
                    id="street"
                    {...register("street")}
                    placeholder="Rua das Calandrinas, Avenida Central, etc"
                  />
                  <p className="text-xs text-muted-foreground">
                    Incluir o tipo: Rua, Avenida, Alameda, Travessa, etc
                  </p>
                  {errors.street && (
                    <p className="text-sm text-destructive">{getErrorMessage(errors.street)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    {...register("number")}
                    placeholder="123"
                  />
                  {errors.number && (
                    <p className="text-sm text-destructive">{getErrorMessage(errors.number)}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  {...register("complement")}
                  placeholder="Apto, Sala, Bloco..."
                />
                {errors.complement && (
                  <p className="text-sm text-destructive">{getErrorMessage(errors.complement)}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    {...register("neighborhood")}
                    placeholder="Nome do bairro"
                  />
                  {errors.neighborhood && (
                    <p className="text-sm text-destructive">{getErrorMessage(errors.neighborhood)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Nome da cidade"
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{getErrorMessage(errors.city)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="PR"
                    maxLength={2}
                    className="uppercase"
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive">{getErrorMessage(errors.state)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Observações adicionais"
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.notes)}</p>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Responsáveis no Estabelecimento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* RESPONSÁVEL FINANCEIRO */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-base flex items-center gap-2 pb-2 border-b">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  FINANCEIRO
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="responsible_financial.name">Nome</Label>
                  <Input
                    id="responsible_financial.name"
                    {...register("responsible_financial.name")}
                    placeholder="Nome do responsável financeiro"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responsible_financial.phone">Telefone</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    maskChar={null}
                    value={watch("responsible_financial.phone") || ""}
                    onChange={(e) => setValue("responsible_financial.phone", e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="responsible_financial.phone"
                        placeholder="(00) 00000-0000"
                      />
                    )}
                  </InputMask>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible_financial.email">E-mail</Label>
                  <Input
                    id="responsible_financial.email"
                    type="email"
                    {...register("responsible_financial.email")}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* RESPONSÁVEL ACOMPANHAMENTO TÉCNICO */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-base flex items-center gap-2 pb-2 border-b">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  ACOMPANHAMENTO TÉCNICO
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="responsible_technical.name">Nome</Label>
                  <Input
                    id="responsible_technical.name"
                    {...register("responsible_technical.name")}
                    placeholder="Nome do responsável técnico"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responsible_technical.phone">Telefone</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    maskChar={null}
                    value={watch("responsible_technical.phone") || ""}
                    onChange={(e) => setValue("responsible_technical.phone", e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="responsible_technical.phone"
                        placeholder="(00) 00000-0000"
                      />
                    )}
                  </InputMask>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible_technical.email">E-mail</Label>
                  <Input
                    id="responsible_technical.email"
                    type="email"
                    {...register("responsible_technical.email")}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* RESPONSÁVEL LEGAL */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-base flex items-center gap-2 pb-2 border-b">
                  <Scale className="h-5 w-5 text-purple-600" />
                  RESPONSÁVEL LEGAL
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="responsible_legal.name">Nome</Label>
                  <Input
                    id="responsible_legal.name"
                    {...register("responsible_legal.name")}
                    placeholder="Nome do responsável legal"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responsible_legal.phone">Telefone</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    maskChar={null}
                    value={((watch("responsible_legal") as any)?.phone) || ""}
                    onChange={(e) => setValue("responsible_legal.phone", e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="responsible_legal.phone"
                        placeholder="(00) 00000-0000"
                      />
                    )}
                  </InputMask>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsible_legal.email">E-mail</Label>
                  <Input
                    id="responsible_legal.email"
                    type="email"
                    {...register("responsible_legal.email")}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>
          </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ClientForm;
