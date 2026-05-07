import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRLabelsDialog } from "./QRLabelsDialog";
import type { LabelData } from "./QRLabelRenderer";
import { useQRCodes, type QRCode } from "@/hooks/useQRCodes";
import { useQRTemplates, type QRTemplate } from "@/hooks/useQRTemplates";
import { useQRProducts } from "@/hooks/useQRProducts";
import { QrCode, Wrench, Eye, Printer, X } from "lucide-react";

interface QRBatchesDialogProps {
  open: boolean;
  onClose: () => void;
  filter: "all" | "today";
}

interface Batch {
  batchId: string;
  template: QRTemplate | undefined;
  productName: string;
  codes: QRCode[];
  date: string;
  type: "fabricated" | "assistance";
}

function codesToLabels(
  codes: QRCode[],
  productName: string,
  modelCode: string,
): LabelData[] {
  return codes.map((code) => ({
    qrValue: `https://www.curitibainoxapp.com/qr/${code.code}`,
    productName,
    modelCode,
    serialNumber: code.serial_number || code.code,
    lotNumber: code.lot_number || "",
  }));
}

export function QRBatchesDialog({
  open,
  onClose,
  filter,
}: QRBatchesDialogProps) {
  const { qrCodes } = useQRCodes();
  const { templates } = useQRTemplates();
  const { products } = useQRProducts();
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const batches = useMemo<Batch[]>(() => {
    const filtered =
      filter === "today"
        ? qrCodes.filter((c) => c.created_at?.startsWith(today))
        : qrCodes;

    const map = new Map<string, QRCode[]>();
    filtered.forEach((code) => {
      const key = code.batch_id || code.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(code);
    });

    return Array.from(map.entries())
      .map(([batchId, codes]) => {
        const first = codes[0];
        const template = templates.find((t) => t.id === first.template_id);
        const product = products.find((p) => p.id === first.product_id);
        return {
          batchId,
          template,
          productName:
            product?.name ||
            (first.qr_type === "assistance" ? "Assistencia Tecnica" : ""),
          codes,
          date: first.created_at,
          type: first.qr_type,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [qrCodes, templates, products, filter, today]);

  const title =
    filter === "today" ? "Etiquetas Geradas Hoje" : "QR Codes Gerados";
  const emptyMessage =
    filter === "today"
      ? "Nenhuma etiqueta gerada hoje."
      : "Nenhum QR Code gerado ainda.";

  return (
    <>
      <Dialog
        open={open && !selectedBatch}
        onOpenChange={(v) => !v && onClose()}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Clique em um lote para visualizar e imprimir as etiquetas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {batches.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                {emptyMessage}
              </div>
            )}
            {batches.map((batch) => {
              const dateStr = new Date(batch.date).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              const lotNumber = batch.codes[0]?.lot_number;
              return (
                <div
                  key={batch.batchId}
                  onClick={() => batch.template && setSelectedBatch(batch)}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                    batch.template
                      ? "cursor-pointer hover:border-primary hover:shadow-sm"
                      : "opacity-50"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      batch.type === "fabricated"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-green-50 text-green-600"
                    }`}
                  >
                    {batch.type === "fabricated" ? (
                      <QrCode className="h-4 w-4" />
                    ) : (
                      <Wrench className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {batch.productName || "Sem produto"}
                      {lotNumber && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          &bull; {lotNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dateStr} &bull;{" "}
                      {batch.template?.name || "Template removido"} &bull;{" "}
                      {batch.template
                        ? `${batch.template.width_cm}x${batch.template.height_cm}cm`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {batch.codes.length}
                    </span>
                    {batch.template && (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" /> Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedBatch && selectedBatch.template && (
        <QRLabelsDialog
          open={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          template={selectedBatch.template}
          labels={codesToLabels(
            selectedBatch.codes,
            selectedBatch.productName,
            products.find((p) => p.id === selectedBatch.codes[0]?.product_id)
              ?.model_code || "",
          )}
          title={`${selectedBatch.codes.length} Etiquetas — ${selectedBatch.productName}`}
          description={
            selectedBatch.codes[0]?.lot_number
              ? `Lote: ${selectedBatch.codes[0].lot_number}`
              : `Categoria: ${selectedBatch.productName}`
          }
          showPrint
        />
      )}
    </>
  );
}
