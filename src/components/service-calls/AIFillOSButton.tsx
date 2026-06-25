import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useFillOSFromMedia,
  type AIFilledOSFields,
} from "@/hooks/useFillOSFromMedia";

interface AIFillOSButtonProps {
  audio: Blob | null;
  images: File[];
  disabled?: boolean;
  onApply: (fields: AIFilledOSFields) => void;
}

// Rótulos e ordem de exibição na revisão. technical_diagnosis e defect_found
// não têm campo próprio na OS — vão para Observações ao aplicar (ver ServiceCallForm).
const FIELD_LABELS: { key: keyof AIFilledOSFields; label: string }[] = [
  { key: "problem_description", label: "Descrição do problema" },
  { key: "equipment_description", label: "Equipamento" },
  { key: "equipment_manufacturer", label: "Fabricante" },
  { key: "equipment_serial_number", label: "Nº de série" },
  { key: "technical_diagnosis", label: "Diagnóstico técnico → Observações" },
  { key: "defect_found", label: "Defeito encontrado → Observações" },
  { key: "notes", label: "Observações" },
];

const CONFIDENCE: Record<string, { label: string; variant: string }> = {
  high: { label: "Confiança alta", variant: "default" },
  medium: { label: "Confiança média", variant: "secondary" },
  low: {
    label: "Confiança baixa — revise com atenção",
    variant: "destructive",
  },
};

export function AIFillOSButton({
  audio,
  images,
  disabled,
  onApply,
}: AIFillOSButtonProps) {
  const { fillFromMedia, isLoading } = useFillOSFromMedia();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AIFilledOSFields | null>(null);

  const noMedia = !audio && images.length === 0;

  const handleClick = async () => {
    const result = await fillFromMedia(audio, images);
    if (result) {
      setDraft(result);
      setOpen(true);
    }
  };

  const updateField = (key: keyof AIFilledOSFields, value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const handleApply = () => {
    if (draft) onApply(draft);
    setOpen(false);
  };

  const conf = draft
    ? (CONFIDENCE[draft.confidence] ?? CONFIDENCE.medium)
    : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={disabled || isLoading || noMedia}
        title={
          noMedia
            ? "Grave um áudio ou anexe uma foto para usar a IA"
            : "Preencher os campos da OS a partir do áudio e das fotos"
        }
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {isLoading ? "Analisando..." : "Preencher com IA"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Revisar preenchimento da IA
            </DialogTitle>
            <DialogDescription>
              Revise e edite antes de aplicar. Nada é salvo automaticamente — só
              os campos que você confirmar serão preenchidos na OS.
            </DialogDescription>
          </DialogHeader>

          {conf && (
            <Badge variant={conf.variant as never} className="w-fit">
              {conf.label}
            </Badge>
          )}

          <div className="space-y-3">
            {draft &&
              FIELD_LABELS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`ai-${key}`}>{label}</Label>
                  <Textarea
                    id={`ai-${key}`}
                    value={(draft[key] as string) ?? ""}
                    onChange={(e) => updateField(key, e.target.value)}
                    placeholder="(a IA não identificou — deixe em branco para não alterar)"
                    rows={key === "problem_description" ? 3 : 2}
                  />
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleApply}>
              Aplicar à OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
