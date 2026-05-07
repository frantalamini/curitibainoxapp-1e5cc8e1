import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import { useQRProducts } from "@/hooks/useQRProducts";
import { useQRTemplates } from "@/hooks/useQRTemplates";
import { useQRCodes, type QRCode } from "@/hooks/useQRCodes";
import { QRLabelsDialog } from "@/components/qr-code/QRLabelsDialog";
import type { LabelData } from "@/components/qr-code/QRLabelRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, QrCode, Globe, Eye } from "lucide-react";

function buildSerial(format: string, prefix: string, serial: number): string {
  const seq = String(serial).padStart(5, "0");
  const year = new Date().getFullYear();
  switch (format) {
    case "prefix_year_seq":
      return `${prefix}-${year}-${seq}`;
    case "model_seq":
      return `${prefix}-${seq}`;
    case "sequential":
      return seq;
    default:
      return seq;
  }
}

const QRGenerateFabricated = () => {
  const navigate = useNavigate();
  const { products } = useQRProducts();
  const { templates } = useQRTemplates();
  const { generateFabricated, isGenerating } = useQRCodes();

  const [productId, setProductId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    codes: QRCode[];
    batchId: string;
    lotNumber: string;
  } | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  const lotPreview = useMemo(() => {
    if (!selectedProduct) return "";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    if (selectedProduct.lot_format === "lt_year_month")
      return `LT-${year}-${month}`;
    return `LT-${String(selectedProduct.lots_generated + 1).padStart(3, "0")}`;
  }, [selectedProduct]);

  const serialPreview = useMemo(() => {
    if (!selectedProduct) return "";
    return buildSerial(
      selectedProduct.serial_format,
      selectedProduct.serial_prefix,
      selectedProduct.next_serial,
    );
  }, [selectedProduct]);

  const previewLabels = useMemo<LabelData[]>(() => {
    if (!selectedProduct) return [];
    const count = Math.min(quantity, 6);
    return Array.from({ length: count }, (_, i) => {
      const serial = buildSerial(
        selectedProduct.serial_format,
        selectedProduct.serial_prefix,
        selectedProduct.next_serial + i,
      );
      return {
        qrValue: `https://www.curitibainoxapp.com/qr/${serial}`,
        productName: selectedProduct.name,
        modelCode: selectedProduct.model_code,
        serialNumber: serial,
        lotNumber: lotPreview,
      };
    });
  }, [selectedProduct, quantity, lotPreview]);

  const generatedLabels = useMemo<LabelData[]>(() => {
    if (!generatedResult || !selectedProduct) return [];
    return generatedResult.codes.map((code) => ({
      qrValue: `https://www.curitibainoxapp.com/qr/${code.code}`,
      productName: selectedProduct.name,
      modelCode: selectedProduct.model_code,
      serialNumber: code.serial_number || code.code,
      lotNumber: code.lot_number || "",
    }));
  }, [generatedResult, selectedProduct]);

  const handleGenerate = async () => {
    if (!productId || !templateId || !selectedProduct) return;
    try {
      const result = await generateFabricated({
        productId,
        templateId,
        quantity,
        serialFormat: selectedProduct.serial_format,
        serialPrefix: selectedProduct.serial_prefix,
        nextSerial: selectedProduct.next_serial,
        lotFormat: selectedProduct.lot_format,
        destinationUrl: "https://www.curitibainoxapp.com/qr/hub",
      });
      setGeneratedResult(result);
    } catch {
      // toast handled by hook
    }
  };

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/qr-code")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="bg-white rounded-lg border p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <QrCode className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">
              Gerar QR -- Produtos Fabricados
            </h2>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Produto
            </label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar produto cadastrado..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.model_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <div className="bg-gray-50 rounded-lg p-3 border text-sm">
              <div className="text-xs text-muted-foreground mb-2">
                DADOS AUTO-PREENCHIDOS
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Lote:</span>{" "}
                  <strong>{lotPreview}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Modelo:</span>{" "}
                  <strong>{selectedProduct.model_code}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Prox. Serial:</span>{" "}
                  <strong>{serialPreview}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Prefixo:</span>{" "}
                  <strong>{selectedProduct.serial_prefix}</strong>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Template de Etiqueta
            </label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.width_cm} x {t.height_cm} cm)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Templates criados em "Templates de Etiquetas"
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Quantidade de Etiquetas
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                min={1}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">etiquetas</span>
            </div>
            {selectedProduct && (
              <p className="text-xs text-muted-foreground mt-1">
                Cada etiqueta recebe um serial unico sequencial ({serialPreview}{" "}
                ate{" "}
                {buildSerial(
                  selectedProduct.serial_format,
                  selectedProduct.serial_prefix,
                  selectedProduct.next_serial + quantity - 1,
                )}
                )
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Destino ao escanear
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              O cliente sera direcionado para a pagina hub. Os links sao
              configuraveis em <strong>Configuracoes</strong>.
            </p>
            <div className="bg-primary rounded-lg p-3 text-white text-xs">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <Globe className="h-4 w-4" />
                curitibainoxapp.com/qr/hub
              </div>
              <div className="flex gap-1 flex-wrap opacity-80">
                {["Manuais", "Pecas", "Assistencia", "Compras", "Contato"].map(
                  (item) => (
                    <span
                      key={item}
                      className="bg-white/20 px-2 py-0.5 rounded-full text-xs"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!productId || !templateId}
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4 mr-1" /> Visualizar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!productId || !templateId || isGenerating}
              className="flex-1"
            >
              {isGenerating ? "Gerando..." : `Gerar ${quantity} QR Codes`}
            </Button>
          </div>
        </div>
      </div>

      {selectedTemplate && (
        <>
          <QRLabelsDialog
            open={showPreview}
            onClose={() => setShowPreview(false)}
            template={selectedTemplate}
            labels={previewLabels}
            title="Preview das Etiquetas"
            description={`Visualizacao de como ficarao as etiquetas. Mostrando ${previewLabels.length} de ${quantity}.`}
          />
          <QRLabelsDialog
            open={!!generatedResult}
            onClose={() => {
              setGeneratedResult(null);
              navigate("/qr-code");
            }}
            template={selectedTemplate}
            labels={generatedLabels}
            title={`${generatedResult?.codes.length || 0} Etiquetas Geradas`}
            description={`Lote: ${generatedResult?.lotNumber || ""}`}
            showPrint
          />
        </>
      )}
    </MainLayout>
  );
};

export default QRGenerateFabricated;
