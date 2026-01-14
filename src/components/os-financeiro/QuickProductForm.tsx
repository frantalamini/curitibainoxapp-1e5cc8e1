import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProducts, Product } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Package, Save } from "lucide-react";

const PRODUCT_TYPES = [
  { value: "revenda", label: "Revenda" },
  { value: "peca_assistencia", label: "Peça Assistência" },
  { value: "materia_prima", label: "Matéria Prima" },
  { value: "consumo_interno", label: "Consumo Interno" },
  { value: "servico", label: "Serviço" },
];

const UNITS = [
  { value: "UN", label: "UN" },
  { value: "PC", label: "PC" },
  { value: "KG", label: "KG" },
  { value: "MT", label: "MT" },
  { value: "LT", label: "LT" },
  { value: "HR", label: "HR" },
];

interface QuickProductFormProps {
  onSuccess: (product: Product) => void;
}

export const QuickProductForm = ({ onSuccess }: QuickProductFormProps) => {
  const { toast } = useToast();
  const { createProduct } = useProducts();
  const { isAdmin, isTechnician } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    type: "",
    unit: "UN",
    cost_price: null as number | null,
    markup: 0,
    track_stock: true,
  });

  // Cálculo automático do preço de venda baseado no markup
  const calculatedSalePrice = useMemo(() => {
    if (formData.cost_price && formData.cost_price > 0) {
      const result = formData.cost_price * (1 + formData.markup / 100);
      return Math.round(result * 100) / 100; // Arredondar para 2 casas decimais
    }
    return null;
  }, [formData.cost_price, formData.markup]);

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      type: "",
      unit: "UN",
      cost_price: null,
      markup: 0,
      track_stock: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createProduct.mutateAsync({
        name: formData.name,
        sku: formData.sku || null,
        type: formData.type || null,
        unit: formData.unit || null,
        cost_price: formData.cost_price,
        markup: formData.markup,
        sale_price: calculatedSalePrice,
        unit_price: calculatedSalePrice,
        track_stock: formData.track_stock,
      });

      toast({ title: "Produto criado com sucesso" });
      setIsOpen(false);
      resetForm();
      
      // Call the callback with the created product
      if (result) {
        onSuccess(result as Product);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao criar produto", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Técnicos não veem o formulário de cadastro rápido de produto
  // pois não podem ver informações financeiras
  if (isTechnician && !isAdmin) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Novo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Cadastro Rápido de Produto
          </DialogTitle>
          <DialogDescription>
            Preencha os dados mínimos para criar um produto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quick-name">Nome *</Label>
            <Input
              id="quick-name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nome do produto"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quick-sku">SKU</Label>
              <Input
                id="quick-sku"
                value={formData.sku}
                onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                placeholder="Código"
              />
            </div>

            <div>
              <Label htmlFor="quick-unit">Unidade</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
              >
                <SelectTrigger id="quick-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="quick-type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger id="quick-type">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campos financeiros - apenas para Admin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quick-cost">Preço Custo *</Label>
              <Input
                id="quick-cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    cost_price: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="quick-markup">Markup (%)</Label>
              <Input
                id="quick-markup"
                type="number"
                step="0.01"
                min="0"
                value={formData.markup}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    markup: e.target.value ? Number(e.target.value) : 0,
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="quick-sale">Preço Venda (calculado)</Label>
            <Input
              id="quick-sale"
              type="number"
              step="0.01"
              min="0"
              value={calculatedSalePrice ?? ""}
              readOnly
              className="bg-muted cursor-not-allowed"
              placeholder="Automático"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Preço de venda calculado automaticamente com base no custo e markup
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="quick-track-stock" className="text-sm">
                Controlar Estoque
              </Label>
              <p className="text-xs text-muted-foreground">
                Registra entradas e saídas
              </p>
            </div>
            <Switch
              id="quick-track-stock"
              checked={formData.track_stock}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, track_stock: checked }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Salvando..." : "Criar Produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
