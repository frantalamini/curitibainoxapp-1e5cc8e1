import { useEffect, useState } from "react";
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
import { Search, Loader2, DollarSign, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

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
    .or(z.literal("")),
  notes: z.string()
    .trim()
    .max(1000, "Observações muito longas (máximo 1000 caracteres)")
    .optional()
    .or(z.literal("")),
  
  responsible_financial: z.object({
    name: z.string().trim().max(100, "Nome muito longo").default(""),
    phone: z.string().trim().regex(/^[\d\s()-]*$/, "Telefone inválido").default(""),
  }).default({ name: "", phone: "" }),
  responsible_technical: z.object({
    name: z.string().trim().max(100, "Nome muito longo").default(""),
    phone: z.string().trim().regex(/^[\d\s()-]*$/, "Telefone inválido").default(""),
  }).default({ name: "", phone: "" }),
});

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (clientId: string) => void;
}

export const ClientFormDialog = ({ open, onOpenChange, onClientCreated }: ClientFormDialogProps) => {
  const { createClient } = useClients();
  const { lookupCNPJ, lookupCEP, isLoading } = useCNPJLookup();
  const [documentType, setDocumentType] = useState<"CPF" | "CNPJ">("CPF");
  const [documentValue, setDocumentValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const cleanEmptyObjects = (data: ClientInsert): ClientInsert => {
    const cleaned = { ...data };
    
    if (cleaned.responsible_financial) {
      const hasFinancialData = cleaned.responsible_financial.name || cleaned.responsible_financial.phone;
      if (!hasFinancialData) {
        cleaned.responsible_financial = null;
      }
    }
    
    if (cleaned.responsible_technical) {
      const hasTechnicalData = cleaned.responsible_technical.name || cleaned.responsible_technical.phone;
      if (!hasTechnicalData) {
        cleaned.responsible_technical = null;
      }
    }
    
    return cleaned;
  };

  const onSubmit = async (formData: ClientInsert) => {
    try {
      const data = cleanEmptyObjects(formData);
      const result = await createClient.mutateAsync(data);
      
      // Invalidar cache para atualizar lista
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      
      toast({
        title: "✅ Cliente Criado",
        description: "Novo cliente criado com sucesso!",
      });
      
      // Resetar formulário
      reset();
      setDocumentValue("");
      setDocumentType("CPF");
      
      // Fechar dialog e retornar ID
      onClientCreated(result.id);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar os dados do cliente. Tente novamente.",
        variant: "destructive",
      });
      console.error("Erro ao salvar cliente:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente para incluir no chamado
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="secondary_name">Nome Secundário</Label>
            <Input
              id="secondary_name"
              {...register("secondary_name")}
              placeholder="Identificação complementar (ex: Unidade Centro)"
            />
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
                <RadioGroupItem value="CPF" id="dialog-cpf" />
                <Label htmlFor="dialog-cpf" className="font-normal cursor-pointer">CPF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CNPJ" id="dialog-cnpj" />
                <Label htmlFor="dialog-cnpj" className="font-normal cursor-pointer">CNPJ</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
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
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {errors.cpf_cnpj && (
              <p className="text-sm text-destructive">{errors.cpf_cnpj.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <InputMask
                mask={
                  (() => {
                    const phoneDigits = (watch("phone") || "").replace(/\D/g, "");
                    return phoneDigits.length >= 11 || phoneDigits.charAt(2) === '9'
                      ? "(99) 99999-9999"
                      : "(99) 9999-9999";
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

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Endereço</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    {...register("cep")}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleCEPSearch}
                    disabled={isLoading || !watch("cep")}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    {...register("street")}
                    placeholder="Nome da rua"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Nº</Label>
                  <Input
                    id="number"
                    {...register("number")}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    {...register("neighborhood")}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">UF</Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
