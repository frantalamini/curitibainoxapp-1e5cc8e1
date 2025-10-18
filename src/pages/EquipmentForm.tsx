import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEquipment, type EquipmentInsert } from "@/hooks/useEquipment";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const EquipmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { equipment, createEquipment, updateEquipment } = useEquipment();
  const { clients } = useClients();
  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EquipmentInsert>();

  const clientId = watch("client_id");

  useEffect(() => {
    if (isEdit && equipment) {
      const eq = equipment.find((e) => e.id === id);
      if (eq) {
        reset(eq);
      }
    }
  }, [id, equipment, reset, isEdit]);

  const onSubmit = async (data: EquipmentInsert) => {
    if (isEdit) {
      await updateEquipment.mutateAsync({ id: id!, ...data });
    } else {
      await createEquipment.mutateAsync(data);
    }
    navigate("/equipment");
  };

  return (
    <MainLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/equipment")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Editar Equipamento" : "Novo Equipamento"}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="client_id">Cliente *</Label>
            <Select
              value={clientId}
              onValueChange={(value) => setValue("client_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca *</Label>
              <Input
                id="brand"
                {...register("brand", { required: "Marca é obrigatória" })}
                placeholder="Ex: Samsung, Apple, Motorola"
              />
              {errors.brand && (
                <p className="text-sm text-destructive">{errors.brand.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo *</Label>
              <Input
                id="model"
                {...register("model", { required: "Modelo é obrigatório" })}
                placeholder="Ex: Galaxy S21, iPhone 13"
              />
              {errors.model && (
                <p className="text-sm text-destructive">{errors.model.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Número de Série</Label>
              <Input
                id="serial_number"
                {...register("serial_number")}
                placeholder="Serial Number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imei">IMEI</Label>
              <Input
                id="imei"
                {...register("imei")}
                placeholder="IMEI do aparelho"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Observações sobre o equipamento"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              {isEdit ? "Atualizar" : "Criar"} Equipamento
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/equipment")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default EquipmentForm;
