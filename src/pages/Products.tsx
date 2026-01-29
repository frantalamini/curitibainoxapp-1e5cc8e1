import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useProducts } from "@/hooks/useProducts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Search, Package, Edit, Trash2, Box } from "lucide-react";
import { MobileCard, MobileCardRow, MobileCardHeader, MobileCardFooter } from "@/components/ui/mobile-card";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getProductTypeLabel = (type: string | null) => {
  const types: Record<string, string> = {
    revenda: "Revenda",
    peca_assistencia: "Peça Assistência",
    materia_prima: "Matéria Prima",
    consumo_interno: "Consumo Interno",
    servico: "Serviço",
  };
  return type ? types[type] || type : "-";
};

export default function Products() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { products, isLoading, deleteProduct } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: "Produto removido com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao remover produto", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Produtos
            </h1>
            <p className="text-muted-foreground text-sm">
              Cadastro de peças, materiais e serviços
            </p>
          </div>
          <Button onClick={() => navigate("/products/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProducts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Box className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum produto cadastrado</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Cadastre seu primeiro produto para começar
              </p>
              <Button onClick={() => navigate("/products/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mobile Cards */}
        {!isLoading && isMobile && filteredProducts.length > 0 && (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <MobileCard key={product.id}>
                <MobileCardHeader
                  title={product.name}
                  subtitle={product.sku ? `SKU: ${product.sku}` : undefined}
                  badge={
                    product.track_stock ? (
                      <Badge variant="secondary" className="text-xs">
                        {product.stock_balance ?? 0} {product.unit || "un"}
                      </Badge>
                    ) : undefined
                  }
                />
                <div className="space-y-1">
                  <MobileCardRow label="Tipo" value={getProductTypeLabel(product.type)} />
                  <MobileCardRow label="Unidade" value={product.unit || "-"} />
                  <MobileCardRow label="Preço Venda" value={formatCurrency(product.sale_price)} />
                </div>
                <MobileCardFooter onEdit={() => navigate(`/products/${product.id}/edit`)} />
              </MobileCard>
            ))}
          </div>
        )}

        {/* Desktop Table */}
        {!isLoading && !isMobile && filteredProducts.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Nome</TableHead>
                    <TableHead className="w-20">SKU</TableHead>
                    <TableHead className="w-24">Tipo</TableHead>
                    <TableHead className="w-16">Un.</TableHead>
                    <TableHead className="text-right w-24">Preço</TableHead>
                    <TableHead className="text-right w-20">Estoque</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-sm max-w-[150px] truncate" title={product.name}>{product.name}</TableCell>
                      <TableCell className="text-sm">{product.sku || "-"}</TableCell>
                      <TableCell className="text-xs">{getProductTypeLabel(product.type)}</TableCell>
                      <TableCell className="text-sm">{product.unit || "-"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(product.sale_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.track_stock ? (
                          <Badge variant="secondary" className="text-xs">
                            {product.stock_balance ?? 0}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
