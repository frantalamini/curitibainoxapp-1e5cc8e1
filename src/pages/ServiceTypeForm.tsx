import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useToast } from "@/hooks/use-toast";
import { toTitleCase } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve estar no formato #RRGGBB"),
  active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

const ServiceTypeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { serviceTypes, createServiceType, updateServiceType } = useServiceTypes();
  const [previewColor, setPreviewColor] = useState("#3b82f6");
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
      active: true,
    },
  });

  useEffect(() => {
    if (id && serviceTypes) {
      const type = serviceTypes.find((t) => t.id === id);
      if (type) {
        form.reset({
          name: type.name,
          color: type.color,
          active: type.active,
        });
        setPreviewColor(type.color);
      }
    }
  }, [id, serviceTypes, form]);

  const onSubmit = (formData: FormData) => {
    // Normalizar nome para Title Case
    const data = { ...formData, name: toTitleCase(formData.name) };

    if (id) {
      updateServiceType({ id, ...data });
      toast({
        title: "✅ Tipo de Serviço Atualizado",
        description: "As alterações foram salvas com sucesso!",
      });
    } else {
      createServiceType({
        name: data.name,
        color: data.color,
        active: data.active,
      });
      toast({
        title: "✅ Tipo de Serviço Criado",
        description: "Novo tipo de serviço criado com sucesso!",
      });
    }
    navigate("/service-types");
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {id ? "Editar" : "Novo"} Tipo de Serviço
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Tipo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Instalação" {...field} />
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
                      <FormLabel>Cor do Marcador</FormLabel>
                      <div className="flex gap-4 items-start">
                        <FormControl>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setPreviewColor(e.target.value);
                              }}
                              className="w-20 h-10 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e);
                                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                  setPreviewColor(e.target.value);
                                }
                              }}
                              placeholder="#3b82f6"
                              className="w-32"
                            />
                          </div>
                        </FormControl>
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: previewColor }}
                          />
                          <span className="text-sm">Preview</span>
                        </div>
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
                        <FormLabel>Status Ativo</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Tipos inativos não aparecem ao criar chamados
                        </div>
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
                  <Button type="submit" className="flex-1">
                    {id ? "Salvar Alterações" : "Criar Tipo"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/service-types")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ServiceTypeForm;
