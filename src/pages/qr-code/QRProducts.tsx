import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useQRProducts } from "@/hooks/useQRProducts";
import { Package, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const QRProducts = () => {
  const navigate = useNavigate();
  const { products, isLoading } = useQRProducts();

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/qr-code")}
          className="text-muted-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <PageHeader
          title="Produtos / Modelos"
          actionLabel="Novo Produto"
          onAction={() => navigate("/qr-code/produtos/novo")}
        />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum produto cadastrado</p>
            <p className="text-sm mt-1">
              Cadastre produtos que receberao QR Code
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/qr-code/produtos/${product.id}`)}
                className="bg-white rounded-lg border p-4 flex items-center gap-3 cursor-pointer hover:border-primary hover:bg-blue-50/50 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {product.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Modelo: {product.model_code} &bull; {product.lots_generated}{" "}
                    lotes gerados
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default QRProducts;
