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
import { useVehicles, VehicleInsert, VehicleStatus } from "@/hooks/useVehicles";
import { useVehicleMaintenances, MaintenanceType } from "@/hooks/useVehicleMaintenances";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  brand: z.string().optional(),
  plate: z.string().min(1, "Placa é obrigatória"),
  renavam: z.string().optional(),
  current_odometer_km: z.coerce.number().min(0, "Quilometragem deve ser maior ou igual a 0").default(0),
  status: z.enum(['ativo', 'inativo', 'em_manutencao']).default('ativo'),
  maintenance_started_at: z.string().optional(),
  maintenance_type: z.enum(['preventiva', 'corretiva', 'colisao']).optional(),
  maintenance_finished_at: z.string().optional(),
}).superRefine((data, ctx) => {
  // Se status for "em_manutencao", exigir campos de manutenção
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      brand: "",
      plate: "",
      renavam: "",
      current_odometer_km: 0,
      status: 'ativo',
      maintenance_started_at: "",
      maintenance_type: undefined,
      maintenance_finished_at: "",
    },
  });

  const watchStatus = form.watch("status");

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
            renavam: data.renavam || "",
            current_odometer_km: data.current_odometer_km,
            status: data.status,
            maintenance_started_at: "",
            maintenance_type: undefined,
            maintenance_finished_at: "",
          });
        }
      };

      fetchVehicle();
    }
  }, [id, form, toast]);

  const onSubmit = async (formData: FormData) => {
    try {
      // Normalizar nome para Title Case, brand para Title Case e placa para maiúsculas
      const vehicleData = {
        name: toTitleCase(formData.name),
        brand: formData.brand ? toTitleCase(formData.brand) : undefined,
        plate: formData.plate.toUpperCase(),
        renavam: formData.renavam,
        current_odometer_km: formData.current_odometer_km,
        status: formData.status,
      };

      // Cenário 1: Status mudou para "em_manutencao"
      if (formData.status === 'em_manutencao' && previousStatus !== 'em_manutencao') {
        // Criar registro de manutenção
        const maintenanceData = {
          vehicle_id: id || "", // Será preenchido após criar o veículo se for novo
          maintenance_type: formData.maintenance_type as MaintenanceType,
          started_at: new Date(formData.maintenance_started_at!).toISOString(),
          finished_at: null,
        };

        if (id) {
          // Atualizar veículo existente
          updateVehicle({ id, ...vehicleData });
          // Criar manutenção
          createMaintenance({ ...maintenanceData, vehicle_id: id });
        } else {
          // Criar novo veículo
          const { data: newVehicle } = await supabase
            .from("vehicles")
            .insert(vehicleData)
            .select()
            .single();
          
          if (newVehicle) {
            // Criar manutenção para o novo veículo
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

        // Buscar manutenção em aberto
        if (id) {
          const openMaintenance = await getOpenMaintenance(id);
          if (openMaintenance) {
            // Atualizar manutenção com data de fim
            updateMaintenance({
              id: openMaintenance.id,
              finished_at: new Date(formData.maintenance_finished_at).toISOString(),
            });
          }
          // Atualizar veículo
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
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
              name="renavam"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RENAVAM (Opcional)</FormLabel>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
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

            <div className="flex gap-4">
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
