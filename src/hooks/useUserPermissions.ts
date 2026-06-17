import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ProfileType = "gerencial" | "adm" | "tecnico";

// ============================================================
// Todos os módulos do sistema (espelham o menu lateral real)
// ============================================================

export type SystemModule =
  // Cadastros
  | "clients"
  | "products"
  | "equipment"
  | "service_types"
  | "service_statuses"
  | "payment_methods"
  | "vehicles"
  | "technicians"
  | "users"
  | "checklists"
  // Serviços
  | "service_calls"
  | "os_aba_geral"
  | "os_aba_tecnico"
  | "os_aba_financeiro"
  | "reimbursements"
  | "pendencias"
  | "contracts"
  | "service_reports"
  // Vendas
  | "vendas"
  | "vendas_entregas"
  // Compras
  | "compras"
  | "compras_solicitacoes"
  | "compras_cotacoes"
  | "compras_pedidos"
  | "compras_recebimentos"
  | "compras_nf_entrada"
  // Agenda
  | "schedule"
  | "agenda_tecnicos_campo"
  | "technician_map"
  // Finanças
  | "finances"
  | "financas_contas_pagar"
  | "financas_contas_receber"
  | "financas_cartoes"
  | "financas_fluxo"
  | "financas_dre"
  | "financas_rentabilidade"
  | "financas_centro_custo"
  | "financas_custos_tecnico"
  | "financas_custos_veiculo"
  | "financas_conciliacao"
  | "financas_orcamento"
  | "financas_recorrentes"
  | "financas_config"
  // Relatórios
  | "relatorios_dashboard"
  | "relatorios_indicadores"
  | "relatorios_financeiro"
  | "relatorios_manutencoes"
  | "relatorios_deslocamentos"
  // IA
  | "ia"
  // QR Code
  | "qrcode"
  // Notas de Serviço
  | "service_notes"
  // Configurações
  | "settings";

// ============================================================
// Árvore hierárquica — espelha o menu lateral do app
// ============================================================

export interface MenuGroupItem {
  key: SystemModule;
  label: string;
  sublevel?: boolean; // true = indentado (ex: abas da OS)
}

export interface MenuGroup {
  group: string;
  items: MenuGroupItem[];
}

export const MENU_TREE: MenuGroup[] = [
  {
    group: "Cadastros",
    items: [
      { key: "clients", label: "Clientes e Fornecedores" },
      { key: "products", label: "Produtos" },
      { key: "equipment", label: "Equipamentos (Ativos)" },
      { key: "service_types", label: "Tipos de Serviço" },
      { key: "service_statuses", label: "Status de Chamado" },
      { key: "payment_methods", label: "Formas de Pagamento" },
      { key: "vehicles", label: "Veículos" },
      { key: "technicians", label: "Técnicos" },
      { key: "users", label: "Gerenciar Usuários" },
      { key: "checklists", label: "Checklists" },
    ],
  },
  {
    group: "Serviços",
    items: [
      { key: "service_calls", label: "Ordens de Serviço" },
      { key: "os_aba_geral", label: "Aba Geral", sublevel: true },
      { key: "os_aba_tecnico", label: "Aba Técnico", sublevel: true },
      { key: "os_aba_financeiro", label: "Aba Financeiro", sublevel: true },
      { key: "service_notes", label: "Notas de Serviço" },
      { key: "reimbursements", label: "Reembolso Técnico" },
      { key: "pendencias", label: "Pendências" },
      { key: "contracts", label: "Contratos" },
      { key: "service_reports", label: "Relatórios de OS" },
    ],
  },
  {
    group: "Vendas",
    items: [
      { key: "vendas", label: "Orçamentos e Vendas" },
      { key: "vendas_entregas", label: "Entregas" },
    ],
  },
  {
    group: "Compras",
    items: [
      { key: "compras", label: "Acesso ao Módulo Compras" },
      { key: "compras_solicitacoes", label: "Solicitações" },
      { key: "compras_cotacoes", label: "Cotações" },
      { key: "compras_pedidos", label: "Pedidos de Compra" },
      { key: "compras_recebimentos", label: "Recebimentos" },
      { key: "compras_nf_entrada", label: "NF de Entrada" },
    ],
  },
  {
    group: "Agenda",
    items: [
      { key: "schedule", label: "Compromissos" },
      { key: "agenda_tecnicos_campo", label: "Técnicos em Campo" },
      { key: "technician_map", label: "Mapa de Técnicos" },
    ],
  },
  {
    group: "Finanças",
    items: [
      { key: "finances", label: "Acesso ao Módulo Financeiro" },
      { key: "financas_contas_pagar", label: "Contas a Pagar" },
      { key: "financas_contas_receber", label: "Contas a Receber" },
      { key: "financas_cartoes", label: "Cartões de Crédito" },
      { key: "financas_fluxo", label: "Fluxo de Caixa" },
      { key: "financas_dre", label: "DRE" },
      { key: "financas_rentabilidade", label: "Rentabilidade OS" },
      { key: "financas_centro_custo", label: "Centro de Custo" },
      { key: "financas_custos_tecnico", label: "Custos por Técnico" },
      { key: "financas_custos_veiculo", label: "Custos por Veículo" },
      { key: "financas_conciliacao", label: "Conciliação Bancária" },
      { key: "financas_orcamento", label: "Orçamento Mensal" },
      { key: "financas_recorrentes", label: "Despesas Recorrentes" },
      { key: "financas_config", label: "Configurações Financeiras" },
    ],
  },
  {
    group: "Relatórios",
    items: [
      { key: "relatorios_dashboard", label: "Dashboard" },
      { key: "relatorios_indicadores", label: "Indicadores Técnicos" },
      { key: "relatorios_financeiro", label: "Financeiro" },
      { key: "relatorios_manutencoes", label: "Manutenções de Veículos" },
      { key: "relatorios_deslocamentos", label: "Deslocamentos" },
    ],
  },
  {
    group: "IA",
    items: [{ key: "ia", label: "Base de Conhecimento" }],
  },
  {
    group: "QR Code",
    items: [{ key: "qrcode", label: "Acesso ao Módulo QR Code" }],
  },
  {
    group: "Configurações",
    items: [{ key: "settings", label: "Acesso às Configurações" }],
  },
];

// ============================================================
// Mapa de módulo-pai (umbrella) → granularidade
// Marcar o módulo-pai (ex: "finances") concede acesso a todos os
// filhos automaticamente (compatível com o comportamento legado).
// Marcar só um filho (ex: "financas_dre") concede acesso apenas a ele.
// Resolvido centralmente em hasProfilePermission.
// ============================================================

export const MODULE_PARENT: Partial<Record<SystemModule, SystemModule>> = {
  // Finanças
  financas_contas_pagar: "finances",
  financas_contas_receber: "finances",
  financas_cartoes: "finances",
  financas_fluxo: "finances",
  financas_dre: "finances",
  financas_rentabilidade: "finances",
  financas_centro_custo: "finances",
  financas_custos_tecnico: "finances",
  financas_custos_veiculo: "finances",
  financas_conciliacao: "finances",
  financas_orcamento: "finances",
  financas_recorrentes: "finances",
  financas_config: "finances",
  // Compras
  compras_solicitacoes: "compras",
  compras_cotacoes: "compras",
  compras_pedidos: "compras",
  compras_recebimentos: "compras",
  compras_nf_entrada: "compras",
  // Vendas
  vendas_entregas: "vendas",
};

// Lista plana derivada da árvore — usada no upsert do banco
export const ALL_MODULES: { key: SystemModule; label: string }[] =
  MENU_TREE.flatMap((g) =>
    g.items.map((i) => ({ key: i.key, label: i.label })),
  );

// ============================================================
// Tipos legado (mantidos para compatibilidade)
// ============================================================

export interface UserPermission {
  id: string;
  user_id: string;
  profile_type: ProfileType;
  module: SystemModule;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const PROFILE_LABELS: Record<ProfileType, string> = {
  gerencial: "Gerencial",
  adm: "Administrativo",
  tecnico: "Técnico",
};

// ============================================================
// Hooks (mantidos para compatibilidade com componentes de OS)
// ============================================================

export const useUserPermissions = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!userId,
  });
};

export const useCurrentUserPermissions = () => {
  return useQuery({
    queryKey: ["current-user-permissions"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return { profileType: null, permissions: [] };
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      const permissions = data as UserPermission[];
      const profileType =
        permissions.length > 0 ? permissions[0].profile_type : null;
      return { profileType, permissions };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useSaveUserPermissions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      profileType,
      permissions,
    }: {
      userId: string;
      profileType: ProfileType;
      permissions: {
        module: SystemModule;
        can_view: boolean;
        can_edit: boolean;
        can_delete: boolean;
      }[];
    }) => {
      const { error: deleteError } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;
      const permissionsToInsert = ALL_MODULES.map((m) => {
        const perm = permissions.find((p) => p.module === m.key);
        return {
          user_id: userId,
          profile_type: profileType,
          module: m.key,
          can_view:
            profileType === "gerencial" ? true : (perm?.can_view ?? false),
          can_edit:
            profileType === "gerencial" ? true : (perm?.can_edit ?? false),
          can_delete:
            profileType === "gerencial" ? true : (perm?.can_delete ?? false),
        };
      });
      // LEGADO/DEPRECADO: grava na tabela antiga user_permissions, cujo
      // module é o enum system_module (15 valores). O sistema atual usa
      // useSaveProfilePermissions (profile_permissions). Cast evita o erro
      // de tipo causado pelos módulos novos fora do enum legado.
      const { error: insertError } = await supabase
        .from("user_permissions")
        .insert(permissionsToInsert as never);
      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user-permissions", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["current-user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Permissões salvas",
        description: "As permissões foram atualizadas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar permissões",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const checkPermission = (
  permissions: UserPermission[],
  module: SystemModule,
  action: "view" | "edit" | "delete",
): boolean => {
  if (permissions.length === 0) return false;
  if (permissions[0]?.profile_type === "gerencial") return true;
  const perm = permissions.find((p) => p.module === module);
  if (!perm) return false;
  switch (action) {
    case "view":
      return perm.can_view;
    case "edit":
      return perm.can_edit;
    case "delete":
      return perm.can_delete;
    default:
      return false;
  }
};
