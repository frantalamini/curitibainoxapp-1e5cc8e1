import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
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
import { ArrowLeft, Wrench, MessageCircle, Eye } from "lucide-react";

const CATEGORIES: Record<string, string> = {
  all: "Todos / Generico",
  Esterilizadores: "Esterilizadores",
  "Cozinhas Industriais": "Cozinhas Industriais",
  "Mesas e Bancadas": "Mesas e Bancadas",
};

const QRGenerateAssistance = () => {
  const navigate = useNavigate();
  const { templates } = useQRTemplates();
  const { generateAssistance, isGenerating } = useQRCodes();

  const [category, setCategory] = useState("all");
  const [templateId, setTemplateId] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    codes: QRCode[];
    batchId: string;
  } | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  const categoryLabel =
    category === "all"
      ? "Assistencia Tecnica"
      : CATEGORIES[category] || category;

  const previewLabels = useMemo<LabelData[]>(() => {
    const count = Math.min(quantity, 6);
    return Array.from({ length: count }, (_, i) => ({
      qrValue: `https://www.curitibainoxapp.com/qr/AT-preview-${String(i + 1).padStart(4, "0")}`,
      productName: categoryLabel,
      modelCode: "",
      serialNumber: `AT-XXXX-${String(i + 1).padStart(4, "0")}`,
      lotNumber: "",
    }));
  }, [quantity, categoryLabel]);

  const generatedLabels = useMemo<LabelData[]>(() => {
    if (!generatedResult) return [];
    return generatedResult.codes.map((code) => ({
      qrValue: `https://www.curitibainoxapp.com/qr/${code.code}`,
      productName: categoryLabel,
      modelCode: "",
      serialNumber: code.code,
      lotNumber: "",
    }));
  }, [generatedResult, categoryLabel]);

  const handleGenerate = async () => {
    if (!templateId) return;
    try {
      const result = await generateAssistance({
        templateId,
        quantity,
        category: category === "all" ? undefined : category,
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
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <Wrench className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">
              Gerar QR -- Assistencia Tecnica
            </h2>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
            <strong>Como funciona:</strong> Gere QR Codes em lote aqui. Imprima
            as etiquetas. O tecnico cola no equipamento em campo e o app vincula
            automaticamente ao cliente/equipamento na hora do atendimento.
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Tipo de Equipamento (opcional)
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Categoriza os QR Codes para organizacao interna. O vinculo real
              acontece em campo.
            </p>
          </div>

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
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Quantidade
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
            <p className="text-xs text-muted-foreground mt-1">
              {quantity} QR Codes unicos serao gerados. Cada um podera ser
              vinculado a um equipamento diferente.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Ao escanear (cliente)
            </h3>
            <div className="bg-[#075e54] rounded-lg p-3 text-white text-xs flex items-center gap-3">
              <MessageCircle className="h-7 w-7 shrink-0" />
              <div>
                <div className="font-medium text-sm">Abre WhatsApp direto</div>
                <div className="opacity-60 mt-0.5">
                  Mensagem pre-preenchida com dados do equipamento (apos vinculo
                  pelo tecnico)
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!templateId}
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4 mr-1" /> Visualizar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!templateId || isGenerating}
              className="flex-1 bg-green-600 hover:bg-green-700"
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
            description={`Categoria: ${categoryLabel}`}
            showPrint
          />
        </>
      )}
    </MainLayout>
  );
};

export default QRGenerateAssistance;
