import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useQRSettings } from "@/hooks/useQRSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Printer, Globe, Image } from "lucide-react";

const QRSettings = () => {
  const navigate = useNavigate();
  const { settings, isLoading, updateSetting } = useQRSettings();

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [printer, setPrinter] = useState("thermal");
  const [includePhone, setIncludePhone] = useState(true);
  const [includeWebsite, setIncludeWebsite] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp.number);
      setWhatsappMessage(settings.whatsapp.default_message);
      setPrinter(settings.printing.default_printer);
      setIncludePhone(settings.printing.include_phone);
      setIncludeWebsite(settings.printing.include_website);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting({
          key: "whatsapp",
          value: { number: whatsappNumber, default_message: whatsappMessage },
        }),
        updateSetting({
          key: "printing",
          value: {
            default_printer: printer,
            include_phone: includePhone,
            include_website: includeWebsite,
          },
        }),
      ]);
    } finally {
      setSaving(false);
    }
  };

  const hubLinks = [
    { icon: "📖", name: "Manuais e Documentos", status: "pendente" },
    { icon: "🔧", name: "Comprar Pecas", status: "pendente" },
    { icon: "🛠", name: "Assistencia Tecnica", status: "pendente" },
    {
      icon: "🛒",
      name: "Compras em Geral",
      url: "curitibainox.com.br",
      status: "ativo",
    },
    {
      icon: "💬",
      name: "Falar com a Empresa",
      url: "WhatsApp",
      status: "ativo",
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
          Carregando...
        </div>
      </MainLayout>
    );
  }

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
        <PageHeader title="Configuracoes do Modulo QR" />

        {/* Identidade Visual */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Identidade Visual
          </h3>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-dashed">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Image className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium">Logo da Empresa</div>
              <div className="text-xs text-muted-foreground">
                Carregada das Configuracoes Gerais do App
              </div>
            </div>
          </div>
        </div>

        {/* Pagina Hub */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pagina Hub (Produtos Fabricados)
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Configure os botoes e destinos. Voce pode ajustar depois.
          </p>

          <div className="space-y-2">
            {hubLinks.map((link) => (
              <div
                key={link.name}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-base shrink-0">
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{link.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {link.url
                      ? `Destino: ${link.url}`
                      : "Destino: Nao configurado"}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    link.status === "ativo"
                      ? "bg-green-50 text-green-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {link.status === "ativo" ? "Ativo" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              WhatsApp (Assistencia Tecnica)
            </h3>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Numero do WhatsApp
            </label>
            <Input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="(41) 3350-0248"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Mensagem padrao
            </label>
            <textarea
              className="w-full p-3 border rounded-lg text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variaveis: {"{equipamento}"}, {"{modelo}"}, {"{serial}"},{" "}
              {"{cliente}"}, {"{setor}"}
            </p>
          </div>
        </div>

        {/* Impressao */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Impressao
            </h3>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Impressora Padrao
            </label>
            <Select value={printer} onValueChange={setPrinter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal">
                  Impressora Termica de Etiquetas
                </SelectItem>
                <SelectItem value="a4">Impressora Comum (A4)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Incluir telefone na etiqueta</span>
              <button
                onClick={() => setIncludePhone(!includePhone)}
                className={`w-11 h-6 rounded-full relative transition-colors ${includePhone ? "bg-primary" : "bg-gray-300"}`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${
                    includePhone ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Incluir site na etiqueta</span>
              <button
                onClick={() => setIncludeWebsite(!includeWebsite)}
                className={`w-11 h-6 rounded-full relative transition-colors ${includeWebsite ? "bg-primary" : "bg-gray-300"}`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${
                    includeWebsite ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar Configuracoes"}
        </Button>
      </div>
    </MainLayout>
  );
};

export default QRSettings;
