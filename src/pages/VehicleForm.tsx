import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useVehicles, VehicleInsert, VehicleStatus } from "@/hooks/useVehicles";
import { useVehicleMaintenances, MaintenanceType } from "@/hooks/useVehicleMaintenances";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/utils";
import { Upload, FileText, X } from "lucide-react";

const formSchema = z.object({
  // Aba Geral
  name: z.string().min(1, "Nome é obrigatório"),
  brand: z.string().optional(),
  plate: z.string().min(1, "Placa é obrigatória"),
  status: z.enum(['ativo', 'inativo', 'em_manutencao']).default('ativo'),
  // Aba Dados Gerais
  renavam: z.string().optional(),
  current_odometer_km: z.coerce.number().min(0, "Quilometragem deve ser maior ou igual a 0").default(0),
  owner_name: z.string().optional(),
  owner_document: z.string().optional(),
  insurance_company: z.string().optional(),
  insurance_phone: z.string().optional(),
  insurance_broker: z.string().optional(),
  insurance_broker_phone: z.string().optional(),
  insurance_policy_url: z.string().optional(),
  // Campos de manutenção (condicionais)
  maintenance_started_at: z.string().optional(),
  maintenance_type: z.enum(['preventiva', 'corretiva', 'colisao']).optional(),
  maintenance_finished_at: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'em_manutencao') {
    if (!data.maintenance_started_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data/hora de início é obrigatória quando em manutenção",
        path: ["maintenance_started_at"],
      });
    }
    if (!data.maintenance_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tipo de manutenção é obrigatório quando em manutenção",
        path: ["maintenance_type"],
      });
    }
  }
});

type FormData = z.infer<typeof formSchema>;

const VehicleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createVehicle, updateVehicle } = useVehicles();
  const { createMaintenance, updateMaintenance, getOpenMaintenance } = useVehicleMaintenances();
  const [previousStatus, setPreviousStatus] = useState<VehicleStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [policyFileName, setPolicyFileName] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      brand: "",
      plate: "",
      status: 'ativo',
      renavam: "",
      current_odometer_km: 0,
      owner_name: "",
      owner_document: "",
      insurance_company: "",
      insurance_phone: "",
      insurance_broker: "",
      insurance_broker_phone: "",
      insurance_policy_url: "",
      maintenance_started_at: "",
      maintenance_type: undefined,
      maintenance_finished_at: "",
    },
  });

  const watchStatus = form.watch("status");
  const watchPolicyUrl = form.watch("insurance_policy_url");

  useEffect(() => {
    if (id) {
      const fetchVehicle = async () => {
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          toast({
            title: "Erro",
            description: "Erro ao carregar veículo",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          setPreviousStatus(data.status);
          form.reset({
            name: data.name,
            brand: data.brand || "",
            plate: data.plate,
            status: data.status,
            renavam: data.renavam || "",
            current_odometer_km: data.current_odometer_km || 0,
            owner_name: data.owner_name || "",
            owner_document: data.owner_document || "",
            insurance_company: data.insurance_company || "",
            insurance_phone: data.insurance_phone || "",
            insurance_broker: data.insurance_broker || "",
            insurance_broker_phone: data.insurance_broker_phone || "",
            insurance_policy_url: data.insurance_policy_url || "",
            maintenance_started_at: "",
            maintenance_type: undefined,
            maintenance_finished_at: "",
          });
          
          // Extract filename from URL if exists
          if (data.insurance_policy_url) {
            const urlParts = data.insurance_policy_url.split('/');
            setPolicyFileName(urlParts[urlParts.length - 1]);
          }
        }
      };

      fetchVehicle();
    }
  }, [id, form, toast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `vehicle-policies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('service-call-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('service-call-attachments')
        .getPublicUrl(filePath);

      form.setValue("insurance_policy_url", publicUrl);
      setPolicyFileName(file.name);
      
      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao enviar arquivo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    form.setValue("insurance_policy_url", "");
    setPolicyFileName(null);
  };

  const onSubmit = async (formData: FormData) => {
    try {
      const vehicleData = {
        name: toTitleCase(formData.name),
        brand: formData.brand ? toTitleCase(formData.brand) : undefined,
        plate: formData.plate.toUpperCase(),
        renavam: formData.renavam,
        current_odometer_km: formData.current_odometer_km,
        status: formData.status,
        owner_name: formData.owner_name,
        owner_document: formData.owner_document,
        insurance_company: formData.insurance_company,
        insurance_phone: formData.insurance_phone,
        insurance_broker: formData.insurance_broker,
        insurance_broker_phone: formData.insurance_broker_phone,
        insurance_policy_url: formData.insurance_policy_url,
      };

      // Cenário 1: Status mudou para "em_manutencao"
      if (formData.status === 'em_manutencao' && previousStatus !== 'em_manutencao') {
        const maintenanceData = {
          vehicle_id: id || "",
          maintenance_type: formData.maintenance_type as MaintenanceType,
          started_at: new Date(formData.maintenance_started_at!).toISOString(),
          finished_at: null,
        };

        if (id) {
          updateVehicle({ id, ...vehicleData });
          createMaintenance({ ...maintenanceData, vehicle_id: id });
        } else {
          const { data: newVehicle } = await supabase
            .from("vehicles")
            .insert(vehicleData)
            .select()
            .single();
          
          if (newVehicle) {
            createMaintenance({ ...maintenanceData, vehicle_id: newVehicle.id });
          }
        }
      }
      // Cenário 2: Status mudou de "em_manutencao" para "ativo"
      else if (previousStatus === 'em_manutencao' && formData.status === 'ativo') {
        if (!formData.maintenance_finished_at) {
          toast({
            title: "Erro",
            description: "Data/hora de fim da manutenção é obrigatória",
            variant: "destructive",
          });
          return;
        }

        if (id) {
          const openMaintenance = await getOpenMaintenance(id);
          if (openMaintenance) {
            updateMaintenance({
              id: openMaintenance.id,
              finished_at: new Date(formData.maintenance_finished_at).toISOString(),
            });
          }
          updateVehicle({ id, ...vehicleData });
        }
      }
      // Cenário 3: Mudança simples entre ativo/inativo
      else {
        if (id) {
          updateVehicle({ id, ...vehicleData });
        } else {
          createVehicle(vehicleData as VehicleInsert);
        }
      }

      navigate("/vehicles");
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao salvar veículo",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold mb-6">
          {id ? "Editar Veículo" : "Novo Veículo"}
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
              </TabsList>
              
              {/* Aba Geral */}
              <TabsContent value="geral" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Veículo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Van Branca" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Fiat, VW, Renault" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: ABC1234"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <Label>Status</Label>
                        <div className="flex items-center gap-2">
                          <span className={field.value === 'inativo' ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            Inativo
                          </span>
                          <Switch
                            checked={field.value === 'ativo' || field.value === 'em_manutencao'}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? 'ativo' : 'inativo');
                            }}
                          />
                          <span className={field.value === 'ativo' || field.value === 'em_manutencao' ? 'text-success font-medium' : 'text-muted-foreground'}>
                            Ativo
                          </span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campos condicionais quando status = "em_manutencao" */}
                {watchStatus === 'em_manutencao' && (
                  <>
                    <FormField
                      control={form.control}
                      name="maintenance_started_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data e Hora de Início da Manutenção</FormLabel>
                          <FormControl>
                            <Input {...field} type="datetime-local" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maintenance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Manutenção</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="preventiva">Manutenção Preventiva</SelectItem>
                              <SelectItem value="corretiva">Manutenção Corretiva</SelectItem>
                              <SelectItem value="colisao">Colisão</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Campo condicional quando status anterior era "em_manutencao" e atual é "ativo" */}
                {previousStatus === 'em_manutencao' && watchStatus === 'ativo' && (
                  <FormField
                    control={form.control}
                    name="maintenance_finished_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data e Hora de Fim da Manutenção</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>

              {/* Aba Dados Gerais */}
              <TabsContent value="dados-gerais" className="space-y-6 mt-4">
                {/* Dados do Veículo */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados do Veículo</h3>
                  
                  <FormField
                    control={form.control}
                    name="renavam"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RENAVAM</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: 12345678901" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="current_odometer_km"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quilometragem Atual</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            placeholder="Ex: 45000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dados do Proprietário */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados do Proprietário</h3>
                  
                  <FormField
                    control={form.control}
                    name="owner_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social / Nome</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do proprietário ou empresa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="owner_document"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ / CPF</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00.000.000/0000-00 ou 000.000.000-00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dados do Seguro */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados do Seguro</h3>
                  
                  <FormField
                    control={form.control}
                    name="insurance_company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seguradora</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da seguradora" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insurance_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone do Seguro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insurance_broker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Corretor do Seguro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do corretor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insurance_broker_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone do Corretor</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Upload de Apólice */}
                  <div className="space-y-2">
                    <Label>Apólice do Seguro</Label>
                    {watchPolicyUrl ? (
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="flex-1 text-sm truncate">{policyFileName || "Arquivo enviado"}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleRemoveFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <a
                          href={watchPolicyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm hover:underline"
                        >
                          Ver arquivo
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                          id="policy-upload"
                        />
                        <label
                          htmlFor="policy-upload"
                          className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">
                            {uploading ? "Enviando..." : "Fazer upload da apólice"}
                          </span>
                        </label>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: PDF, JPG, PNG
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 pt-4">
              <Button type="submit">
                {id ? "Atualizar" : "Criar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/vehicles")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

export default VehicleForm;