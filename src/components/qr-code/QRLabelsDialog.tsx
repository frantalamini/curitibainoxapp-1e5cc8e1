import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRLabelRenderer, type LabelData } from "./QRLabelRenderer";
import type { QRTemplate } from "@/hooks/useQRTemplates";
import { useQRSettings } from "@/hooks/useQRSettings";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Printer, Eye, X } from "lucide-react";

interface QRLabelsDialogProps {
  open: boolean;
  onClose: () => void;
  template: QRTemplate;
  labels: LabelData[];
  title?: string;
  description?: string;
  showPrint?: boolean;
}

function buildThermalHtml(
  labelElements: NodeListOf<Element>,
  template: QRTemplate,
  scale: number,
) {
  const w = template.width_cm;
  const h = template.height_cm;
  const offsetX = (w * -0.05).toFixed(3);
  const offsetY = (h * 0.07).toFixed(3);

  let pages = "";
  labelElements.forEach((el) => {
    pages += `<div class="page"><div class="label-wrap">${el.outerHTML}</div></div>`;
  });

  return `<!DOCTYPE html>
<html><head>
<title>Etiquetas - ${template.name}</title>
<style>
@page{size:${w}cm ${h}cm;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:${w}cm;height:${h}cm;overflow:hidden;page-break-after:always}
.page:last-child{page-break-after:auto}
.label-wrap{transform:translate(${offsetX}cm,${offsetY}cm) scale(${scale.toFixed(4)});transform-origin:top left}
.qr-label{border:none !important}
</style>
</head><body>
${pages}
<script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>
</body></html>`;
}

function buildA4Html(
  labelElements: NodeListOf<Element>,
  template: QRTemplate,
  scale: number,
) {
  const w = template.width_cm;
  const h = template.height_cm;

  let items = "";
  labelElements.forEach((el) => {
    items += `<div style="width:${w}cm;height:${h}cm;overflow:hidden;break-inside:avoid;flex-shrink:0;"><div style="transform:scale(${scale.toFixed(4)});transform-origin:top left;">${el.outerHTML}</div></div>`;
  });

  return `<!DOCTYPE html>
<html><head>
<title>Etiquetas - ${template.name}</title>
<style>
@page{size:A4;margin:8mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.grid{display:flex;flex-wrap:wrap;gap:2mm;padding:2mm}
</style>
</head><body>
<div class="grid">${items}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>
</body></html>`;
}

export function QRLabelsDialog({
  open,
  onClose,
  template,
  labels,
  title,
  description,
  showPrint,
}: QRLabelsDialogProps) {
  const labelsRef = useRef<HTMLDivElement>(null);
  const { settings } = useQRSettings();
  const { settings: sysSettings } = useSystemSettings();
  const [printerOverride, setPrinterOverride] = useState<
    "thermal" | "a4" | null
  >(null);

  const printerType = printerOverride || settings.printing.default_printer;

  const handlePrint = () => {
    if (!labelsRef.current) return;

    const labelElements = labelsRef.current.querySelectorAll(".qr-label");
    if (!labelElements.length) return;

    const displayWidth = 280;
    const targetWidthPx = template.width_cm * 37.795;
    const scale = targetWidthPx / displayWidth;

    const html =
      printerType === "thermal"
        ? buildThermalHtml(labelElements, template, scale)
        : buildA4Html(labelElements, template, scale);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showPrint ? (
              <Printer className="h-5 w-5 text-green-600" />
            ) : (
              <Eye className="h-5 w-5 text-blue-600" />
            )}
            {title || "Etiquetas"}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="border rounded-lg bg-gray-50 p-4 overflow-y-auto max-h-[55vh]">
          <div ref={labelsRef} className="flex flex-wrap gap-3 justify-center">
            {labels.map((label, i) => (
              <QRLabelRenderer
                key={i}
                template={template}
                data={label}
                widthPx={280}
                logoUrl={sysSettings?.report_logo}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {labels.length} etiqueta{labels.length !== 1 ? "s" : ""} &bull;{" "}
            {template.width_cm} x {template.height_cm} cm
          </div>

          {showPrint && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground mr-1">Impressora:</span>
              <button
                onClick={() => setPrinterOverride("thermal")}
                className={`px-2 py-1 rounded border transition-all ${
                  printerType === "thermal"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary"
                }`}
              >
                Bobina
              </button>
              <button
                onClick={() => setPrinterOverride("a4")}
                className={`px-2 py-1 rounded border transition-all ${
                  printerType === "a4"
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary"
                }`}
              >
                A4
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          {showPrint && (
            <Button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimir Etiquetas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
