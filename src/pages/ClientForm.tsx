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
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const clientSchema = z.object({
  full_name: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phone: z.string()
    .trim()
    .min(10, "Telefone deve ter no mínimo 10 dígitos")
    .regex(/^[\d\s()-]+$/, "Telefone deve conter apenas números"),
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
    .trim()
    .max(100, "Complemento muito longo")
    .optional()
    .or(z.literal("")),
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
    .trim()
    .max(1000, "Observações muito longas (máximo 1000 caracteres)")
    .optional()
    .or(z.literal("")),
});

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients, createClient, updateClient } = useClients();
  const { lookupCNPJ, lookupCEP, isLoading } = useCNPJLookup();
  const isEdit = !!id;
  const [documentType, setDocumentType] = useState<"CPF" | "CNPJ">("CPF");
  const [documentValue, setDocumentValue] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientInsert>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    if (isEdit && clients) {
      const client = clients.find((c) => c.id === id);
      if (client) {
        reset(client);
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

  const onSubmit = async (data: ClientInsert) => {
    if (isEdit) {
      await updateClient.mutateAsync({ id: id!, ...data });
    } else {
      await createClient.mutateAsync(data);
    }
    navigate("/clients");
  };


  return (
    <MainLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Editar Cliente" : "Novo Cliente"}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo / Razão Social *</Label>
            <Input
              id="full_name"
              {...register("full_name", { required: "Nome é obrigatório" })}
              placeholder="Digite o nome completo ou razão social"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
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
                <p className="text-sm text-destructive">{errors.cpf_cnpj.message}</p>
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
                  <p className="text-sm text-destructive">{errors.state_registration.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
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
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
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
                    <p className="text-sm text-destructive">{errors.cep.message}</p>
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
                    <p className="text-sm text-destructive">{errors.street.message}</p>
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
                    <p className="text-sm text-destructive">{errors.number.message}</p>
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
                  <p className="text-sm text-destructive">{errors.complement.message}</p>
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
                    <p className="text-sm text-destructive">{errors.neighborhood.message}</p>
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
                    <p className="text-sm text-destructive">{errors.city.message}</p>
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
                    <p className="text-sm text-destructive">{errors.state.message}</p>
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
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isEdit ? "Atualizar" : "Criar"} Cliente
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clients")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ClientForm;
