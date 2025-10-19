import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useChecklists, ChecklistItem } from "@/hooks/useChecklists";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ChecklistForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createChecklist, updateChecklist } = useChecklists();
  const isEditMode = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);

  const { data: existingChecklist } = useQuery({
    queryKey: ["checklist", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("checklists")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return {
        ...data,
        items: data.items as unknown as ChecklistItem[]
      };
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingChecklist) {
      setName(existingChecklist.name);
      setDescription(existingChecklist.description || "");
      setItems(existingChecklist.items);
    }
  }, [existingChecklist]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        text: "",
        required: false,
      },
    ]);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof ChecklistItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Nome do checklist é obrigatório");
      return;
    }

    if (items.length === 0) {
      alert("Adicione pelo menos um item ao checklist");
      return;
    }

    if (items.some((item) => !item.text.trim())) {
      alert("Todos os itens devem ter um texto");
      return;
    }

    const checklistData = {
      name,
      description: description || undefined,
      items,
    };

    if (isEditMode && id) {
      updateChecklist({ id, ...checklistData });
    } else {
      createChecklist(checklistData);
    }

    navigate("/checklists");
  };

  return (
    <MainLayout>
      <div className="p-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? "Editar Checklist" : "Novo Checklist"}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? "Atualize as informações do checklist"
                : "Crie uma nova lista de verificação para chamados técnicos"}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Checklist *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Verificação de Equipamento"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva quando este checklist deve ser usado"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Itens do Checklist</CardTitle>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex gap-4 items-start p-4 border rounded-lg"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-muted-foreground">
                            Item {index + 1}
                          </span>
                        </div>
                        <Input
                          value={item.text}
                          onChange={(e) =>
                            updateItem(item.id, "text", e.target.value)
                          }
                          placeholder="Descrição do item a verificar"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${item.id}`}
                            checked={item.required}
                            onCheckedChange={(checked) =>
                              updateItem(item.id, "required", checked)
                            }
                          />
                          <Label htmlFor={`required-${item.id}`} className="text-sm">
                            Item obrigatório
                          </Label>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/checklists")}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {isEditMode ? "Atualizar Checklist" : "Criar Checklist"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ChecklistForm;
