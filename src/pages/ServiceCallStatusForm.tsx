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
import { useServiceCallStatuses, ServiceCallStatusInsert } from "@/hooks/useServiceCallStatuses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().min(1, "Cor é obrigatória"),
  active: z.boolean().default(true),
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
          });
        }
      };

      fetchStatus();
    }
  }, [id, form, toast]);

  const onSubmit = (data: FormData) => {
    // Validate required fields before submitting
    if (!data.name || !data.color) {
      toast({
        title: "Erro",
        description: "Nome e cor são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (id) {
      updateStatus({ id, ...data });
    } else {
      createStatus(data as ServiceCallStatusInsert);
    }
    navigate("/service-call-statuses");
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-2xl">
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
