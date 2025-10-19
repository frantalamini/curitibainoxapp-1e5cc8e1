import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTechnicians, type TechnicianInsert } from "@/hooks/useTechnicians";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import InputMask from "react-input-mask";
import { useToast } from "@/hooks/use-toast";

const technicianSchema = z.object({
  full_name: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phone: z.string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 11, "Telefone deve ter 11 dígitos (DDD + 9 dígitos)"),
  specialty_refrigeration: z.boolean().default(false),
  specialty_cooking: z.boolean().default(false),
  additional_notes: z.string()
    .max(300, "Notas devem ter no máximo 300 caracteres")
    .optional()
    .transform((val) => val || undefined),
  active: z.boolean().default(true),
});

const TechnicianForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { technicians, createTechnician, updateTechnician } = useTechnicians();
  const isEdit = !!id;

  const [charCount, setCharCount] = useState(0);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<TechnicianInsert>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      specialty_refrigeration: false,
      specialty_cooking: false,
      additional_notes: "",
      active: true,
    },
  });

  const active = watch("active");
  const specialtyRefrigeration = watch("specialty_refrigeration");
  const specialtyCooking = watch("specialty_cooking");
  const additionalNotes = watch("additional_notes");
  const currentTechnician = technicians?.find((t) => t.id === id);

  useEffect(() => {
    if (isEdit && currentTechnician) {
      reset({
        full_name: currentTechnician.full_name,
        phone: currentTechnician.phone,
        specialty_refrigeration: currentTechnician.specialty_refrigeration,
        specialty_cooking: currentTechnician.specialty_cooking,
        additional_notes: currentTechnician.additional_notes || "",
        active: currentTechnician.active,
      });
      setCharCount(currentTechnician.additional_notes?.length || 0);
    }
  }, [id, currentTechnician, reset, isEdit]);

  useEffect(() => {
    setCharCount(additionalNotes?.length || 0);
  }, [additionalNotes]);

  const onSubmit = async (data: TechnicianInsert) => {
    if (isEdit) {
      await updateTechnician.mutateAsync({ id: id!, ...data });
      toast({
        title: "✅ Técnico Atualizado",
        description: "As alterações foram salvas com sucesso!",
      });
    } else {
      await createTechnician.mutateAsync(data);
      toast({
        title: "✅ Técnico Criado",
        description: "Novo técnico criado com sucesso!",
      });
    }
    navigate("/technicians");
  };

  return (
    <MainLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/technicians")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Editar Técnico" : "Novo Técnico"}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
          {isEdit && currentTechnician && (
            <div className="space-y-2">
              <Label>ID Técnico</Label>
              <Input
                value={currentTechnician.technician_number}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome do Técnico *</Label>
            <Input
              id="full_name"
              {...register("full_name")}
              placeholder="Digite o nome completo"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <InputMask
                  mask="(99) 99999-9999"
                  value={field.value}
                  onChange={field.onChange}
                >
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      id="phone"
                      placeholder="(00) 00000-0000"
                      type="tel"
                    />
                  )}
                </InputMask>
              )}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label>Especialidades</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="specialty_refrigeration"
                checked={specialtyRefrigeration}
                onCheckedChange={(checked) => 
                  setValue("specialty_refrigeration", checked as boolean)
                }
              />
              <Label 
                htmlFor="specialty_refrigeration" 
                className="font-normal cursor-pointer"
              >
                Refrigeração Comercial
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="specialty_cooking"
                checked={specialtyCooking}
                onCheckedChange={(checked) => 
                  setValue("specialty_cooking", checked as boolean)
                }
              />
              <Label 
                htmlFor="specialty_cooking" 
                className="font-normal cursor-pointer"
              >
                Cocção
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="additional_notes">Informações Adicionais</Label>
              <span className="text-sm text-muted-foreground">
                {charCount}/300
              </span>
            </div>
            <Textarea
              id="additional_notes"
              {...register("additional_notes")}
              placeholder="Digite informações adicionais sobre o técnico..."
              maxLength={300}
              rows={4}
            />
            {errors.additional_notes && (
              <p className="text-sm text-destructive">{errors.additional_notes.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Técnico Ativo</Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={(checked) => setValue("active", checked)}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              {isEdit ? "Atualizar" : "Salvar"} Técnico
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/technicians")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default TechnicianForm;
