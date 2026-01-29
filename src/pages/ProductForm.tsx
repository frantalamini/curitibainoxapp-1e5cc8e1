import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, Save, DollarSign, FileText, Box } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PRODUCT_TYPES = [
  { value: "revenda", label: "Revenda" },
  { value: "peca_assistencia", label: "Peça Assistência" },
  { value: "materia_prima", label: "Matéria Prima" },
  { value: "consumo_interno", label: "Consumo Interno" },
  { value: "servico", label: "Serviço" },
];

const UNITS = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "PC", label: "Peça (PC)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "MT", label: "Metro (MT)" },
  { value: "LT", label: "Litro (LT)" },
  { value: "CX", label: "Caixa (CX)" },
  { value: "PAR", label: "Par (PAR)" },
  { value: "HR", label: "Hora (HR)" },
];

interface ProductFormData {
  name: string;
  sku: string;
  type: string;
  unit: string;
  description: string;
  brand: string;
  model: string;
  cost_price: number | null;
  sale_price: number | null;
  track_stock: boolean;
  min_stock: number | null;
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  ncm: string;
  gtin: string;
  cest: string;
  origin: string;
  tax_icms: number | null;
  tax_pis: number | null;
  tax_cofins: number | null;
}

const initialFormData: ProductFormData = {
  name: "",
  sku: "",
  type: "",
  unit: "UN",
  description: "",
  brand: "",
  model: "",
  cost_price: null,
  sale_price: null,
  track_stock: true,
  min_stock: null,
  weight_kg: null,
  length_cm: null,
  width_cm: null,
  height_cm: null,
  ncm: "",
  gtin: "",
  cest: "",
  origin: "",
  tax_icms: null,
  tax_pis: null,
  tax_cofins: null,
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { createProduct, updateProduct } = useProducts();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  const isEditMode = Boolean(id);

  // Load product data if editing
  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || "",
          sku: data.sku || "",
          type: data.type || "",
          unit: data.unit || "UN",
          description: data.description || "",
          brand: data.brand || "",
          model: data.model || "",
          cost_price: data.cost_price,
          sale_price: data.sale_price,
          track_stock: data.track_stock ?? true,
          min_stock: data.min_stock,
          weight_kg: data.weight_kg,
          length_cm: data.length_cm,
          width_cm: data.width_cm,
          height_cm: data.height_cm,
          ncm: data.ncm || "",
          gtin: data.gtin || "",
          cest: data.cest || "",
          origin: data.origin || "",
          tax_icms: data.tax_icms,
          tax_pis: data.tax_pis,
          tax_cofins: data.tax_cofins,
        });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao carregar produto", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku || null,
        type: formData.type || null,
        unit: formData.unit || null,
        description: formData.description || null,
        brand: formData.brand || null,
        model: formData.model || null,
        cost_price: formData.cost_price,
        sale_price: formData.sale_price,
        // Also update unit_price for backward compatibility
        unit_price: formData.sale_price,
        track_stock: formData.track_stock,
        min_stock: formData.min_stock,
        weight_kg: formData.weight_kg,
        length_cm: formData.length_cm,
        width_cm: formData.width_cm,
        height_cm: formData.height_cm,
        ncm: formData.ncm || null,
        gtin: formData.gtin || null,
        cest: formData.cest || null,
        origin: formData.origin || null,
        tax_icms: formData.tax_icms,
        tax_pis: formData.tax_pis,
        tax_cofins: formData.tax_cofins,
      };

      if (isEditMode && id) {
        await updateProduct.mutateAsync({ id, ...payload });
        toast({ title: "Produto atualizado com sucesso" });
      } else {
        await createProduct.mutateAsync(payload);
        toast({ title: "Produto criado com sucesso" });
      }

      navigate("/products");
    } catch (error) {
      console.error(error);
      toast({
        title: isEditMode ? "Erro ao atualizar produto" : "Erro ao criar produto",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading && isEditMode) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              {isEditMode ? "Editar Produto" : "Novo Produto"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isEditMode ? "Atualize as informações do produto" : "Cadastre um novo produto no catálogo"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="geral" className="flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Dados Gerais</span>
                <span className="sm:hidden">Geral</span>
              </TabsTrigger>
              <TabsTrigger value="precos" className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Preços</span>
                <span className="sm:hidden">$</span>
              </TabsTrigger>
              <TabsTrigger value="fiscal" className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Fiscal</span>
                <span className="sm:hidden">Fiscal</span>
              </TabsTrigger>
              <TabsTrigger value="estoque" className="flex items-center gap-1.5">
                <Box className="w-4 h-4" />
                <span className="hidden sm:inline">Estoque</span>
                <span className="sm:hidden">Est.</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Dados Gerais */}
            <TabsContent value="geral">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Nome do produto"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="sku">SKU / Código</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => updateField("sku", e.target.value)}
                        placeholder="Ex: PRD001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => updateField("type", value)}
                      >
                        <SelectTrigger>
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

                    <div>
                      <Label htmlFor="unit">Unidade</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => updateField("unit", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
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

                    <div>
                      <Label htmlFor="brand">Marca</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => updateField("brand", e.target.value)}
                        placeholder="Ex: Electrolux"
                      />
                    </div>

                    <div>
                      <Label htmlFor="model">Modelo</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => updateField("model", e.target.value)}
                        placeholder="Ex: ABC-123"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Descrição detalhada do produto..."
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Preços */}
            <TabsContent value="precos">
              <Card>
                <CardHeader>
                  <CardTitle>Preços</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost_price">Preço de Custo</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_price ?? ""}
                        onChange={(e) =>
                          updateField(
                            "cost_price",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="0,00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="sale_price">Preço de Venda</Label>
                      <Input
                        id="sale_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.sale_price ?? ""}
                        onChange={(e) =>
                          updateField(
                            "sale_price",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {formData.cost_price && formData.sale_price && formData.sale_price > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Margem de lucro:{" "}
                        <span className="font-medium text-foreground">
                          {(
                            ((formData.sale_price - formData.cost_price) /
                              formData.sale_price) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Fiscal */}
            <TabsContent value="fiscal">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Fiscais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ncm">NCM</Label>
                      <Input
                        id="ncm"
                        value={formData.ncm}
                        onChange={(e) => updateField("ncm", e.target.value)}
                        placeholder="Ex: 8418.50.10"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gtin">GTIN / EAN</Label>
                      <Input
                        id="gtin"
                        value={formData.gtin}
                        onChange={(e) => updateField("gtin", e.target.value)}
                        placeholder="Código de barras"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cest">CEST</Label>
                      <Input
                        id="cest"
                        value={formData.cest}
                        onChange={(e) => updateField("cest", e.target.value)}
                        placeholder="Código CEST"
                      />
                    </div>

                    <div>
                      <Label htmlFor="origin">Origem</Label>
                      <Input
                        id="origin"
                        value={formData.origin}
                        onChange={(e) => updateField("origin", e.target.value)}
                        placeholder="Ex: Nacional"
                      />
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="taxes">
                      <AccordionTrigger>Alíquotas de Impostos</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                          <div>
                            <Label htmlFor="tax_icms">ICMS (%)</Label>
                            <Input
                              id="tax_icms"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formData.tax_icms ?? ""}
                              onChange={(e) =>
                                updateField(
                                  "tax_icms",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              placeholder="0,00"
                            />
                          </div>

                          <div>
                            <Label htmlFor="tax_pis">PIS (%)</Label>
                            <Input
                              id="tax_pis"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formData.tax_pis ?? ""}
                              onChange={(e) =>
                                updateField(
                                  "tax_pis",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              placeholder="0,00"
                            />
                          </div>

                          <div>
                            <Label htmlFor="tax_cofins">COFINS (%)</Label>
                            <Input
                              id="tax_cofins"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formData.tax_cofins ?? ""}
                              onChange={(e) =>
                                updateField(
                                  "tax_cofins",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Estoque */}
            <TabsContent value="estoque">
              <Card>
                <CardHeader>
                  <CardTitle>Controle de Estoque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="track_stock" className="text-base">
                        Controlar Estoque
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ative para rastrear entradas e saídas deste produto
                      </p>
                    </div>
                    <Switch
                      id="track_stock"
                      checked={formData.track_stock}
                      onCheckedChange={(checked) => updateField("track_stock", checked)}
                    />
                  </div>

                  {formData.track_stock && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="min_stock">Estoque Mínimo</Label>
                          <Input
                            id="min_stock"
                            type="number"
                            min="0"
                            value={formData.min_stock ?? ""}
                            onChange={(e) =>
                              updateField(
                                "min_stock",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            placeholder="0"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Alerta quando o estoque ficar abaixo deste valor
                          </p>
                        </div>
                      </div>

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="dimensions">
                          <AccordionTrigger>Dimensões do Produto</AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                              <div>
                                <Label htmlFor="weight_kg">Peso (kg)</Label>
                                <Input
                                  id="weight_kg"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={formData.weight_kg ?? ""}
                                  onChange={(e) =>
                                    updateField(
                                      "weight_kg",
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                  placeholder="0,00"
                                />
                              </div>

                              <div>
                                <Label htmlFor="length_cm">Comprimento (cm)</Label>
                                <Input
                                  id="length_cm"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={formData.length_cm ?? ""}
                                  onChange={(e) =>
                                    updateField(
                                      "length_cm",
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <Label htmlFor="width_cm">Largura (cm)</Label>
                                <Input
                                  id="width_cm"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={formData.width_cm ?? ""}
                                  onChange={(e) =>
                                    updateField(
                                      "width_cm",
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <Label htmlFor="height_cm">Altura (cm)</Label>
                                <Input
                                  id="height_cm"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={formData.height_cm ?? ""}
                                  onChange={(e) =>
                                    updateField(
                                      "height_cm",
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate("/products")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Salvando..." : isEditMode ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
