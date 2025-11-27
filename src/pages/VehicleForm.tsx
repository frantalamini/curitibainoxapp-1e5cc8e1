import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useVehicles, VehicleInsert } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  plate: z.string().min(1, "Placa é obrigatória"),
  renavam: z.string().optional(),
  current_odometer_km: z.coerce.number().min(0, "Quilometragem deve ser maior ou igual a 0").default(0),
  active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

const VehicleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createVehicle, updateVehicle } = useVehicles();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      plate: "",
      renavam: "",
      current_odometer_km: 0,
      active: true,
    },
  });

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
          form.reset({
            name: data.name,
            plate: data.plate,
            renavam: data.renavam || "",
            current_odometer_km: data.current_odometer_km,
            active: data.active,
          });
        }
      };

      fetchVehicle();
    }
  }, [id, form, toast]);

  const onSubmit = (formData: FormData) => {
    // Normalizar nome para Title Case e placa para maiúsculas
    const data = {
      ...formData,
      name: toTitleCase(formData.name),
      plate: formData.plate.toUpperCase(),
    };

    if (id) {
      updateVehicle({ id, ...data });
    } else {
      createVehicle(data as VehicleInsert);
    }
    navigate("/vehicles");
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-2xl">
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
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Veículo Ativo</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
