import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  computeLaborCost,
  type Additional,
  type EmploymentType,
  type LaborCostInput,
} from "@/lib/laborCost";

// collaborators / fiscal_settings ainda não estão nos types gerados.
const sb = supabase as unknown as { from: (table: string) => any };

export interface Collaborator {
  id: string;
  full_name: string;
  phone: string | null;
  role_title: string | null;
  employment_type: EmploymentType;
  attends_os: boolean;
  specialty_refrigeration: boolean;
  specialty_cooking: boolean;
  base_salary: number;
  monthly_hours: number;
  additionals: Additional[];
  benefit_meal: number;
  benefit_food: number;
  benefit_transport: number;
  benefit_fuel: number;
  cost_per_hour: number;
  active: boolean;
  collaborator_id?: string;
}

export type CollaboratorInput = Omit<
  Collaborator,
  "id" | "cost_per_hour" | "collaborator_id"
>;

const toLaborInput = (c: CollaboratorInput): LaborCostInput => ({
  employmentType: c.employment_type,
  baseSalary: Number(c.base_salary) || 0,
  monthlyHours: Number(c.monthly_hours) || 0,
  additionals: c.additionals ?? [],
  benefitMeal: Number(c.benefit_meal) || 0,
  benefitFood: Number(c.benefit_food) || 0,
  benefitTransport: Number(c.benefit_transport) || 0,
  benefitFuel: Number(c.benefit_fuel) || 0,
});

export const useCollaborators = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["collaborators"] });
    queryClient.invalidateQueries({ queryKey: ["technicians"] });
    queryClient.invalidateQueries({ queryKey: ["os-profitability"] });
  };

  // Regime tributário da empresa (Simples zera o INSS patronal).
  const { data: isSimplesNacional = true } = useQuery({
    queryKey: ["fiscal-regime"],
    queryFn: async () => {
      const { data } = await sb
        .from("fiscal_settings")
        .select("regime_tributario, optante_simples_nacional")
        .limit(1)
        .maybeSingle();
      if (!data) return true; // sem config -> assume Simples
      return (
        data.optante_simples_nacional === true ||
        data.regime_tributario === "simples_nacional"
      );
    },
  });

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("collaborators")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Collaborator[];
    },
  });

  // Sincroniza o técnico-espelho a partir do colaborador.
  // Cria OU atualiza, sem NUNCA tocar em user_id nem technician_number
  // (login e numeração do técnico são preservados).
  // Se o colaborador deixou de atender OS, desativa o técnico (mantém histórico).
  const syncTechnician = async (
    collaboratorId: string,
    input: CollaboratorInput,
  ) => {
    const { data: existing } = await supabase
      .from("technicians")
      .select("id")
      .eq("collaborator_id", collaboratorId)
      .maybeSingle();

    if (!input.attends_os) {
      if (existing) {
        await supabase
          .from("technicians")
          .update({ active: false } as any)
          .eq("id", existing.id);
      }
      return;
    }

    const fields = {
      full_name: input.full_name,
      phone: input.phone ?? "",
      specialty_refrigeration: input.specialty_refrigeration ?? false,
      specialty_cooking: input.specialty_cooking ?? false,
      active: input.active,
      collaborator_id: collaboratorId,
    };

    if (existing) {
      await supabase
        .from("technicians")
        .update(fields as any)
        .eq("id", existing.id);
    } else {
      await supabase.from("technicians").insert([fields as any]);
    }
  };

  const createCollaborator = useMutation({
    mutationFn: async (input: CollaboratorInput) => {
      const cost = computeLaborCost(toLaborInput(input), isSimplesNacional);
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await sb
        .from("collaborators")
        .insert([
          {
            ...input,
            cost_per_hour: cost.hourlyCost,
            created_by: userData?.user?.id ?? null,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      await syncTechnician(data.id, input);
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Colaborador criado", description: "Salvo com sucesso!" });
    },
    onError: (e: Error) =>
      toast({
        title: "Erro ao criar colaborador",
        description: e.message,
        variant: "destructive",
      }),
  });

  const updateCollaborator = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: CollaboratorInput & { id: string }) => {
      const cost = computeLaborCost(toLaborInput(input), isSimplesNacional);
      const { error } = await sb
        .from("collaborators")
        .update({ ...input, cost_per_hour: cost.hourlyCost })
        .eq("id", id);
      if (error) throw error;
      await syncTechnician(id, input);
    },
    onSuccess: () => {
      invalidate();
      toast({
        title: "Colaborador atualizado",
        description: "Alterações salvas!",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Erro ao atualizar colaborador",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteCollaborator = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("collaborators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Colaborador excluído" });
    },
    onError: (e: Error) =>
      toast({
        title: "Erro ao excluir",
        description: e.message,
        variant: "destructive",
      }),
  });

  return {
    collaborators,
    isLoading,
    isSimplesNacional,
    createCollaborator,
    updateCollaborator,
    deleteCollaborator,
  };
};
