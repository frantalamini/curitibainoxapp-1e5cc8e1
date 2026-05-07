import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import {
  useQRTemplates,
  useQRTemplate,
  type TextElement,
  type QRTemplate,
} from "@/hooks/useQRTemplates";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import {
  QRLabelRenderer,
  type LabelData,
} from "@/components/qr-code/QRLabelRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  QrCode,
} from "lucide-react";

// Position labels for 3x3 grid
const POS_LABELS = [
  "Esq. Superior",
  "Centro Superior",
  "Dir. Superior",
  "Esq. Centro",
  "Centralizado",
  "Dir. Centro",
  "Esq. Inferior",
  "Centro Inferior",
  "Dir. Inferior",
];

const TEXT_TYPES = ["titulo", "subtitulo", "texto", "rodape"] as const;
const TEXT_TYPE_LABELS = {
  titulo: "Titulo",
  subtitulo: "Subtitulo",
  texto: "Texto",
  rodape: "Rodape",
};
const FONT_SIZES = [7, 8, 9, 10, 12, 14, 16, 18, 20];
const VARIABLES = [
  { value: "{produto}", label: "{produto} -- Nome do produto" },
  { value: "{modelo}", label: "{modelo} -- Codigo do modelo" },
  { value: "{serial}", label: "{serial} -- Numero serial" },
  { value: "{lote}", label: "{lote} -- Lote de fabricacao" },
];

// ==========================================
// Alignment Grid Component
// ==========================================
function AlignmentGrid({
  value,
  onChange,
}: {
  value: number;
  onChange: (pos: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-3 gap-[3px]">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            type="button"
            title={POS_LABELS[i]}
            onClick={() => onChange(i)}
            className={`w-7 h-7 rounded border-[1.5px] flex items-center justify-center transition-all ${
              value === i
                ? "bg-primary border-primary"
                : "bg-white border-gray-200 hover:border-primary hover:bg-blue-50"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                value === i ? "bg-white" : "bg-gray-400"
              }`}
            />
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{POS_LABELS[value]}</span>
    </div>
  );
}

// ==========================================
// Size Control Component (+/- buttons)
// ==========================================
function SizeControl({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-primary hover:bg-blue-50 transition-all active:scale-90"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold w-16 text-center">
        {typeof value === "number" && value % 1 !== 0
          ? value.toFixed(1)
          : value}
        {unit}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-primary hover:bg-blue-50 transition-all active:scale-90"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==========================================
// Collapsible Element Card
// ==========================================
function ElementCard({
  title,
  icon,
  iconBg,
  badge,
  defaultOpen,
  onRemove,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  badge?: string;
  defaultOpen?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${open ? "border-primary shadow-sm" : "border-gray-200"}`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center text-sm ${iconBg}`}
        >
          {icon}
        </div>
        <span className="flex-1 text-sm font-medium">{title}</span>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
            {badge}
          </span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          {children}
          {onRemove && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Remover
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PREVIEW_DATA: LabelData = {
  qrValue: "https://curitibainoxapp.com/qr/preview",
  productName: "Esterilizador 150L",
  modelCode: "EST-150-I",
  serialNumber: "CI-2026-00483",
  lotNumber: "LT-2026-03",
};

// ==========================================
// Main Editor Page
// ==========================================
const QRTemplateEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { createTemplate, updateTemplate } = useQRTemplates();
  const { data: existingTemplate } = useQRTemplate(id);
  const { settings } = useSystemSettings();

  // Template state
  const [name, setName] = useState("");
  const [widthCm, setWidthCm] = useState(10);
  const [heightCm, setHeightCm] = useState(5);
  const [logoPosition, setLogoPosition] = useState(0);
  const [logoSizeCm, setLogoSizeCm] = useState(2.0);
  const [qrPosition, setQrPosition] = useState(6);
  const [qrSizeCm, setQrSizeCm] = useState(2.5);
  const [bgEnabled, setBgEnabled] = useState(true);
  const [bgWidthPct, setBgWidthPct] = useState(35);
  const [bgColor, setBgColor] = useState("#18487A");
  const [textElements, setTextElements] = useState<TextElement[]>([
    {
      type: "titulo",
      content: "{produto}",
      font_size: 14,
      bold: true,
      color: "#1f2937",
      is_variable: true,
    },
    {
      type: "subtitulo",
      content: "{modelo}",
      font_size: 10,
      bold: false,
      color: "#6b7280",
      is_variable: true,
    },
    {
      type: "texto",
      content: "Modelo: {modelo}\nSerial: {serial}\nLote: {lote}",
      font_size: 8,
      bold: false,
      color: "#6b7280",
      is_variable: false,
    },
    {
      type: "rodape",
      content: "(41) 3350-0248 | curitibainox.com.br",
      font_size: 7,
      bold: false,
      color: "#9ca3af",
      is_variable: false,
    },
  ]);
  const [textVAlign, setTextVAlign] = useState<"top" | "center" | "bottom">(
    "center",
  );
  const [saving, setSaving] = useState(false);

  // Load existing template
  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setWidthCm(existingTemplate.width_cm);
      setHeightCm(existingTemplate.height_cm);
      setLogoPosition(existingTemplate.logo_position);
      setLogoSizeCm(existingTemplate.logo_size_cm);
      setQrPosition(existingTemplate.qr_position);
      setQrSizeCm(existingTemplate.qr_size_cm);
      setBgEnabled(existingTemplate.bg_enabled);
      setBgWidthPct(existingTemplate.bg_width_pct);
      setBgColor(existingTemplate.bg_color);
      setTextElements(existingTemplate.text_elements || []);
      const tc = (existingTemplate.extra_elements || []).find(
        (e: any) => e?.type === "text_config",
      );
      if (tc?.v_align) setTextVAlign(tc.v_align);
    }
  }, [existingTemplate]);

  const updateTextElement = useCallback(
    (index: number, updates: Partial<TextElement>) => {
      setTextElements((prev) =>
        prev.map((el, i) => (i === index ? { ...el, ...updates } : el)),
      );
    },
    [],
  );

  const removeTextElement = useCallback((index: number) => {
    setTextElements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addTextElement = useCallback(() => {
    setTextElements((prev) => [
      ...prev,
      {
        type: "texto",
        content: "",
        font_size: 10,
        bold: false,
        color: "#374151",
        is_variable: false,
      },
    ]);
  }, []);

  const suggestName = () => {
    const names = [
      `Etiqueta ${widthCm}x${heightCm} ${bgEnabled ? "Faixa" : "Simples"}`,
      `Label ${widthCm}x${heightCm} CI`,
      `Etiqueta Padrao ${widthCm}x${heightCm}`,
    ];
    let i = 0;
    const suggestion = names[Math.floor(Math.random() * names.length)];
    setName("");
    const timer = setInterval(() => {
      if (i <= suggestion.length) {
        setName(suggestion.substring(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 30);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        width_cm: widthCm,
        height_cm: heightCm,
        logo_position: logoPosition,
        logo_size_cm: logoSizeCm,
        qr_position: qrPosition,
        qr_size_cm: qrSizeCm,
        bg_enabled: bgEnabled,
        bg_width_pct: bgWidthPct,
        bg_color: bgColor,
        text_elements: textElements,
        extra_elements: [{ type: "text_config", v_align: textVAlign }],
      };
      if (isEditing && id) {
        await updateTemplate({ id, ...data });
      } else {
        await createTemplate(data);
      }
      navigate("/qr-code/templates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/qr-code/templates")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="bg-white rounded-lg border p-6 space-y-5">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Editar Template" : "Criar Novo Template"}
          </h2>

          {/* Label Size */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Tamanho da Etiqueta (cm)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={widthCm}
                onChange={(e) => setWidthCm(parseFloat(e.target.value) || 1)}
                className="w-16 text-center"
                step={0.5}
                min={1}
              />
              <span className="text-sm text-muted-foreground">x</span>
              <Input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(parseFloat(e.target.value) || 1)}
                className="w-16 text-center"
                step={0.5}
                min={1}
              />
              <span className="text-xs text-muted-foreground">cm</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Preview ao Vivo
            </h3>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1 bg-gray-100 border-b text-xs text-muted-foreground">
                <span>0cm</span>
                <span>{(widthCm / 4).toFixed(1)}</span>
                <span>{(widthCm / 2).toFixed(1)}</span>
                <span>{((widthCm * 3) / 4).toFixed(1)}</span>
                <span>{widthCm}cm</span>
              </div>
              <div className="flex items-center justify-center p-5">
                <QRLabelRenderer
                  template={
                    {
                      width_cm: widthCm,
                      height_cm: heightCm,
                      logo_position: logoPosition,
                      logo_size_cm: logoSizeCm,
                      qr_position: qrPosition,
                      qr_size_cm: qrSizeCm,
                      bg_enabled: bgEnabled,
                      bg_width_pct: bgWidthPct,
                      bg_color: bgColor,
                      text_elements: textElements,
                      extra_elements: [
                        { type: "text_config", v_align: textVAlign },
                      ],
                    } as QRTemplate
                  }
                  data={PREVIEW_DATA}
                  widthPx={360}
                  logoUrl={settings?.report_logo}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Elementos da Etiqueta
            </h3>
            <div className="space-y-2">
              {/* LOGO */}
              <ElementCard
                title="Logo da Empresa"
                icon={<ImageIcon className="h-4 w-4" />}
                iconBg="bg-blue-50 text-blue-600"
                badge="Obrigatorio"
                defaultOpen
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Posicao
                    </label>
                    <AlignmentGrid
                      value={logoPosition}
                      onChange={setLogoPosition}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Tamanho
                    </label>
                    <SizeControl
                      value={logoSizeCm}
                      min={0.6}
                      max={4.5}
                      step={0.2}
                      unit=" cm"
                      onChange={setLogoSizeCm}
                    />
                  </div>
                </div>
              </ElementCard>

              {/* QR CODE */}
              <ElementCard
                title="QR Code"
                icon={<QrCode className="h-4 w-4" />}
                iconBg="bg-blue-50 text-blue-600"
                badge="Obrigatorio"
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Posicao
                    </label>
                    <AlignmentGrid
                      value={qrPosition}
                      onChange={setQrPosition}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Tamanho
                    </label>
                    <SizeControl
                      value={qrSizeCm}
                      min={0.6}
                      max={4.5}
                      step={0.2}
                      unit=" cm"
                      onChange={setQrSizeCm}
                    />
                  </div>
                </div>
              </ElementCard>

              {/* BACKGROUND BAND */}
              <ElementCard
                title="Faixa de Fundo"
                icon={
                  <div
                    className="w-4 h-4 rounded"
                    style={{ background: bgColor }}
                  />
                }
                iconBg="bg-blue-50"
                onRemove={() => setBgEnabled(!bgEnabled)}
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Largura
                    </label>
                    <SizeControl
                      value={bgWidthPct}
                      min={0}
                      max={100}
                      step={5}
                      unit="%"
                      onChange={setBgWidthPct}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Cor
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-7 border border-gray-200 rounded cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">
                        {bgColor}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Exibir faixa
                    </span>
                    <button
                      type="button"
                      onClick={() => setBgEnabled(!bgEnabled)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${bgEnabled ? "bg-primary" : "bg-gray-300"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-all ${bgEnabled ? "left-[22px]" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                </div>
              </ElementCard>
            </div>
          </div>

          {/* TEXT ELEMENTS */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Textos da Etiqueta
              </h3>
              <Button variant="outline" size="sm" onClick={addTextElement}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar Texto
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg border">
              <span className="text-xs text-muted-foreground">
                Posicao vertical:
              </span>
              {(
                [
                  { value: "top", label: "Topo" },
                  { value: "center", label: "Centro" },
                  { value: "bottom", label: "Base" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTextVAlign(opt.value)}
                  className={`px-3 py-1 rounded text-xs border transition-all ${
                    textVAlign === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {textElements.map((el, idx) => (
                <ElementCard
                  key={idx}
                  title={`${TEXT_TYPE_LABELS[el.type]}${el.content ? ` -- ${el.content.substring(0, 20)}` : ""}`}
                  icon={<span className="text-xs font-bold">T</span>}
                  iconBg="bg-amber-50 text-amber-600"
                  onRemove={() => removeTextElement(idx)}
                >
                  <div className="space-y-3">
                    {/* Type selector */}
                    <div className="flex gap-1">
                      {TEXT_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateTextElement(idx, { type: t })}
                          className={`px-3 py-1 rounded text-xs border transition-all ${
                            el.type === t
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-600 border-gray-200 hover:border-primary"
                          }`}
                        >
                          {TEXT_TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>

                    {/* Content */}
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Conteudo
                      </label>
                      <Select
                        value={el.is_variable ? el.content : "__fixed__"}
                        onValueChange={(v) => {
                          if (v === "__fixed__") {
                            updateTextElement(idx, {
                              is_variable: false,
                              content: "",
                            });
                          } else {
                            updateTextElement(idx, {
                              is_variable: true,
                              content: v,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__fixed__">
                            Texto fixo...
                          </SelectItem>
                          {VARIABLES.map((v) => (
                            <SelectItem key={v.value} value={v.value}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fixed text input */}
                    {!el.is_variable && (
                      <Input
                        value={el.content}
                        onChange={(e) =>
                          updateTextElement(idx, { content: e.target.value })
                        }
                        placeholder="Digite o texto fixo..."
                        className="text-sm"
                      />
                    )}

                    {/* Font size + Bold */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">
                          Tamanho
                        </label>
                        <Select
                          value={String(el.font_size)}
                          onValueChange={(v) =>
                            updateTextElement(idx, { font_size: parseInt(v) })
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_SIZES.map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                {s}pt
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-1">
                          Peso
                        </label>
                        <Select
                          value={el.bold ? "bold" : "normal"}
                          onValueChange={(v) =>
                            updateTextElement(idx, { bold: v === "bold" })
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Negrito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Alignment + Color */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">
                          Alinhamento:
                        </span>
                        {(
                          [
                            {
                              value: "left",
                              icon: <AlignLeft className="h-3.5 w-3.5" />,
                            },
                            {
                              value: "center",
                              icon: <AlignCenter className="h-3.5 w-3.5" />,
                            },
                            {
                              value: "right",
                              icon: <AlignRight className="h-3.5 w-3.5" />,
                            },
                          ] as const
                        ).map((a) => (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() =>
                              updateTextElement(idx, { align: a.value })
                            }
                            className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${
                              (el.align || "left") === a.value
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-gray-500 border-gray-200 hover:border-primary"
                            }`}
                          >
                            {a.icon}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          Cor:
                        </span>
                        <input
                          type="color"
                          value={el.color}
                          onChange={(e) =>
                            updateTextElement(idx, { color: e.target.value })
                          }
                          className="w-7 h-6 border-none p-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </ElementCard>
              ))}
            </div>

            {/* Add buttons */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={addTextElement}>
                <Plus className="h-3 w-3 mr-1" /> Texto
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Plus className="h-3 w-3 mr-1" /> Linha
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Plus className="h-3 w-3 mr-1" /> Retangulo
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Plus className="h-3 w-3 mr-1" /> Imagem
              </Button>
            </div>
          </div>

          {/* Save */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Nome do Template
              </label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome sera sugerido..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={suggestName}
                  className="shrink-0"
                >
                  <Sparkles className="h-3 w-3 mr-1" /> Sugerir
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                A IA sugere um nome baseado no tamanho e elementos
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/qr-code/templates")}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1"
              >
                {saving ? "Salvando..." : "Salvar Template"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default QRTemplateEditor;
