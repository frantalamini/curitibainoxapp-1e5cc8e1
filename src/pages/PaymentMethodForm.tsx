import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { ArrowLeft, Save } from "lucide-react";

export default function PaymentMethodForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { paymentMethods, createPaymentMethod, updatePaymentMethod, isLoading } = usePaymentMethods();

  const [form, setForm] = useState({
    name: "",
    active: true,
    sort_order: 0,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load existing data when editing
  useEffect(() => {
    if (isEditing && paymentMethods.length > 0) {
      const existing = paymentMethods.find((pm) => pm.id === id);
      if (existing) {
        setForm({
          name: existing.name,
          active: existing.active,
          sort_order: existing.sort_order,
        });
      }
    }
  }, [id, isEditing, paymentMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEditing) {
        await updatePaymentMethod.mutateAsync({ id, ...form });
      } else {
        await createPaymentMethod.mutateAsync(form);
      }
      navigate("/payment-methods");
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title={isEditing ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
        >
          <Button variant="outline" onClick={() => navigate("/payment-methods")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </PageHeader>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: PIX, Boleto, Cartão de Crédito..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Ordem de exibição</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => setForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Define a ordem de exibição na lista (menor número = aparece primeiro)
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="active">Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Formas inativas não aparecem nas OS
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSaving || !form.name.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </PageContainer>
    </MainLayout>
  );
}
