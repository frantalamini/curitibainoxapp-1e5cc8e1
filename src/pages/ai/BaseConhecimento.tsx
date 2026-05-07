import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  Pencil,
  CheckCircle,
  XCircle,
  Bot,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type KnowledgeStatus = "draft" | "active" | "inactive";

interface KnowledgeEntry {
  id: string;
  equipment_description: string | null;
  equipment_manufacturer: string | null;
  symptom: string;
  diagnosis: string | null;
  solution: string;
  status: KnowledgeStatus;
  source_service_call_id: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<
  KnowledgeStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
};

export default function BaseConhecimento() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | KnowledgeStatus>(
    "all",
  );
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ai-knowledge-entries"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_knowledge_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KnowledgeEntry[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<KnowledgeEntry>;
    }) => {
      const { error } = await (supabase as any)
        .from("ai_knowledge_entries")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-entries"] });
      toast.success("Entrada atualizada com sucesso");
      setEditEntry(null);
    },
    onError: () => toast.error("Erro ao atualizar entrada"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("ai_knowledge_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-entries"] });
      toast.success("Entrada excluída");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir entrada"),
  });

  const filtered = entries.filter((e) => {
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchSearch =
      !search ||
      e.equipment_description?.toLowerCase().includes(search.toLowerCase()) ||
      e.symptom.toLowerCase().includes(search.toLowerCase()) ||
      e.solution.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: entries.length,
    draft: entries.filter((e) => e.status === "draft").length,
    active: entries.filter((e) => e.status === "active").length,
    inactive: entries.filter((e) => e.status === "inactive").length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Base de Conhecimento — IA</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie o que o Consultor IA aprendeu com as Ordens de Serviço
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por equipamento, sintoma ou solução..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              <TabsTrigger value="draft">Rascunho ({counts.draft})</TabsTrigger>
              <TabsTrigger value="active">Ativos ({counts.active})</TabsTrigger>
              <TabsTrigger value="inactive">
                Inativos ({counts.inactive})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma entrada encontrada</p>
            <p className="text-sm mt-1">
              O robô aprende automaticamente ao fechar conversas nas OS
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    Equipamento
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Sintoma</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    Solução
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 font-medium">OS</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {entry.equipment_description || "—"}
                      </div>
                      {entry.equipment_manufacturer && (
                        <div className="text-xs text-muted-foreground">
                          {entry.equipment_manufacturer}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="line-clamp-2">{entry.symptom}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[220px] hidden lg:table-cell">
                      <p className="line-clamp-2">{entry.solution}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_CONFIG[entry.status].variant}>
                        {STATUS_CONFIG[entry.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                      {format(new Date(entry.created_at), "dd/MM/yy", {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {entry.source_service_call_id ? (
                        <a
                          href={`/service-calls/${entry.source_service_call_id}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                        >
                          Ver OS <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {entry.status === "draft" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Ativar"
                            onClick={() =>
                              updateMutation.mutate({
                                id: entry.id,
                                updates: { status: "active" },
                              })
                            }
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {entry.status === "active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                            title="Desativar"
                            onClick={() =>
                              updateMutation.mutate({
                                id: entry.id,
                                updates: { status: "inactive" },
                              })
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {entry.status === "inactive" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Reativar"
                            onClick={() =>
                              updateMutation.mutate({
                                id: entry.id,
                                updates: { status: "active" },
                              })
                            }
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Editar"
                          onClick={() => setEditEntry(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir"
                          onClick={() => setDeleteId(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editEntry && (
        <Dialog open onOpenChange={() => setEditEntry(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Entrada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Equipamento</Label>
                  <Input
                    value={editEntry.equipment_description || ""}
                    onChange={(e) =>
                      setEditEntry({
                        ...editEntry,
                        equipment_description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fabricante</Label>
                  <Input
                    value={editEntry.equipment_manufacturer || ""}
                    onChange={(e) =>
                      setEditEntry({
                        ...editEntry,
                        equipment_manufacturer: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sintoma *</Label>
                <Textarea
                  rows={2}
                  value={editEntry.symptom}
                  onChange={(e) =>
                    setEditEntry({ ...editEntry, symptom: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Diagnóstico</Label>
                <Textarea
                  rows={2}
                  value={editEntry.diagnosis || ""}
                  onChange={(e) =>
                    setEditEntry({ ...editEntry, diagnosis: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Solução *</Label>
                <Textarea
                  rows={3}
                  value={editEntry.solution}
                  onChange={(e) =>
                    setEditEntry({ ...editEntry, solution: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEntry(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  updateMutation.mutate({
                    id: editEntry.id,
                    updates: {
                      equipment_description: editEntry.equipment_description,
                      equipment_manufacturer: editEntry.equipment_manufacturer,
                      symptom: editEntry.symptom,
                      diagnosis: editEntry.diagnosis,
                      solution: editEntry.solution,
                    },
                  })
                }
                disabled={
                  !editEntry.symptom ||
                  !editEntry.solution ||
                  updateMutation.isPending
                }
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteId && (
        <Dialog open onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir entrada?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Esta ação é irreversível. O robô perderá este aprendizado.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
