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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useServiceCallStatuses, ServiceCallStatusInsert } from "@/hooks/useServiceCallStatuses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toTitleCase } from "@/lib/utils";
import { Wrench, Briefcase } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().min(1, "Cor é obrigatória"),
  active: z.boolean().default(true),
  status_type: z.enum(['tecnico', 'comercial'], {
    required_error: "Selecione o tipo de status",
  }),
});

type FormData = z.infer<typeof formSchema>;

const ServiceCallStatusForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createStatus, updateStatus } = useServiceCallStatuses();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
      active: true,
      status_type: "tecnico",
    },
  });

  useEffect(() => {
    if (id) {
      const fetchStatus = async () => {
        const { data, error } = await supabase
          .from("service_call_statuses")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          toast({
            title: "Erro",
            description: "Erro ao carregar status",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          form.reset({
            name: data.name,
            color: data.color,
            active: data.active,
            status_type: data.status_type || "tecnico",
          });
        }
      };

      fetchStatus();
    }
  }, [id, form, toast]);

  const onSubmit = (formData: FormData) => {
    // Validate required fields before submitting
    if (!formData.name || !formData.color) {
      toast({
        title: "Erro",
        description: "Nome e cor são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Normalizar nome para Title Case
    const data = { ...formData, name: toTitleCase(formData.name) };

    if (id) {
      updateStatus({ id, ...data });
    } else {
      createStatus(data as ServiceCallStatusInsert);
    }
    navigate("/service-call-statuses");
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold mb-6">
          {id ? "Editar Status" : "Novo Status"}
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
                    <Input {...field} placeholder="Ex: Em Andamento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <div className="flex gap-4 items-center">
                    <FormControl>
                      <Input type="color" {...field} className="w-24 h-10" />
                    </FormControl>
                    <div
                      className="w-12 h-10 rounded border"
                      style={{ backgroundColor: field.value }}
                    />
                    <span className="text-sm text-muted-foreground">{field.value}</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base">Tipo de Status *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="tecnico" id="tecnico" />
                        <div className="space-y-1 leading-none flex-1">
                          <label
                            htmlFor="tecnico"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            <Wrench className="h-4 w-4 text-blue-600" />
                            Status Técnico
                          </label>
                          <p className="text-sm text-muted-foreground">
                            Andamento do serviço (Ex: Em Andamento, Finalizado)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="comercial" id="comercial" />
                        <div className="space-y-1 leading-none flex-1">
                          <label
                            htmlFor="comercial"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                          >
                            <Briefcase className="h-4 w-4 text-purple-600" />
                            Situação Comercial
                          </label>
                          <p className="text-sm text-muted-foreground">
                            Orçamento/aprovação/faturamento (Ex: Aprovado, Cancelado)
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
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
                    <FormLabel className="text-base">Status Ativo</FormLabel>
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
                onClick={() => navigate("/service-call-statuses")}
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

export default ServiceCallStatusForm;
