import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useClients, type ClientInsert } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients, createClient, updateClient } = useClients();
  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientInsert>();

  useEffect(() => {
    if (isEdit && clients) {
      const client = clients.find((c) => c.id === id);
      if (client) {
        reset(client);
      }
    }
  }, [id, clients, reset, isEdit]);

  const onSubmit = async (data: ClientInsert) => {
    if (isEdit) {
      await updateClient.mutateAsync({ id: id!, ...data });
    } else {
      await createClient.mutateAsync(data);
    }
    navigate("/clients");
  };

  return (
    <MainLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Editar Cliente" : "Novo Cliente"}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              {...register("full_name", { required: "Nome é obrigatório" })}
              placeholder="Digite o nome completo"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                {...register("phone", { required: "Telefone é obrigatório" })}
                placeholder="(00) 00000-0000"
              />
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
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
            <Input
              id="cpf_cnpj"
              {...register("cpf_cnpj")}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="Endereço completo"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1">
              {isEdit ? "Atualizar" : "Criar"} Cliente
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clients")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ClientForm;
