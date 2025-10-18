import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTechnicians, type TechnicianInsert } from "@/hooks/useTechnicians";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const TechnicianForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { technicians, createTechnician, updateTechnician } = useTechnicians();
  const isEdit = !!id;

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TechnicianInsert>();

  const active = watch("active");

  useEffect(() => {
    if (isEdit && technicians) {
      const tech = technicians.find((t) => t.id === id);
      if (tech) {
        reset(tech);
        setSpecialties(tech.specialties || []);
      }
    } else {
      setValue("active", true);
    }
  }, [id, technicians, reset, isEdit, setValue]);

  const addSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      const newSpecialties = [...specialties, specialtyInput.trim()];
      setSpecialties(newSpecialties);
      setValue("specialties", newSpecialties);
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (spec: string) => {
    const newSpecialties = specialties.filter((s) => s !== spec);
    setSpecialties(newSpecialties);
    setValue("specialties", newSpecialties);
  };

  const onSubmit = async (data: TechnicianInsert) => {
    const payload = { ...data, specialties };
    if (isEdit) {
      await updateTechnician.mutateAsync({ id: id!, ...payload });
    } else {
      await createTechnician.mutateAsync(payload);
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
          <div className="space-y-2">
            <Label htmlFor="user_id">ID do Usuário *</Label>
            <Input
              id="user_id"
              {...register("user_id", { required: "ID do usuário é obrigatório" })}
              placeholder="UUID do usuário"
              disabled={isEdit}
            />
            {errors.user_id && (
              <p className="text-sm text-destructive">{errors.user_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialties">Especialidades</Label>
            <div className="flex gap-2">
              <Input
                id="specialties"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                placeholder="Digite uma especialidade"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
              />
              <Button type="button" onClick={addSpecialty}>
                Adicionar
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              {specialties.map((spec) => (
                <Badge key={spec} variant="secondary" className="gap-1">
                  {spec}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeSpecialty(spec)}
                  />
                </Badge>
              ))}
            </div>
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
              {isEdit ? "Atualizar" : "Criar"} Técnico
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
