import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle,
  ShoppingCart,
  Wrench,
  BookOpen,
  Phone,
} from "lucide-react";

interface QRCodeData {
  id: string;
  code: string;
  qr_type: "fabricated" | "assistance";
  product_id?: string;
  lot_number?: string;
  serial_number?: string;
  category?: string;
  status: string;
}

interface ProductData {
  name: string;
  model_code: string;
  description?: string;
}

interface SettingsData {
  logo_url: string | null;
  report_logo: string | null;
  company_name: string | null;
  company_phone: string | null;
  company_website: string | null;
}

interface QRModuleSetting {
  setting_key: string;
  setting_value: any;
}

export default function QRPublicHub() {
  const { code } = useParams<{ code: string }>();
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [whatsapp, setWhatsapp] = useState({ number: "", default_message: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) return;

    async function load() {
      try {
        const { data: qr, error: qrErr } = await (supabase as any)
          .from("qr_codes")
          .select("*")
          .eq("code", code)
          .single();

        if (qrErr || !qr) {
          setError(true);
          setLoading(false);
          return;
        }

        setQrData(qr);

        // Incrementar contador de scans
        await (supabase as any)
          .from("qr_codes")
          .update({
            scanned_count: (qr.scanned_count || 0) + 1,
            last_scanned_at: new Date().toISOString(),
          })
          .eq("id", qr.id);

        const promises: Promise<any>[] = [];

        // Buscar produto se existir
        if (qr.product_id) {
          promises.push(
            (supabase as any)
              .from("qr_products")
              .select("name, model_code, description")
              .eq("id", qr.product_id)
              .single()
              .then(({ data }: any) => {
                if (data) setProduct(data);
              }),
          );
        }

        // Buscar configuracoes do sistema
        promises.push(
          supabase
            .from("system_settings")
            .select(
              "report_logo, logo_url, company_name, company_phone, company_website",
            )
            .single()
            .then(({ data }: any) => {
              if (data) setSettings(data);
            }),
        );

        // Buscar config WhatsApp do modulo QR
        promises.push(
          (supabase as any)
            .from("qr_module_settings")
            .select("setting_key, setting_value")
            .eq("setting_key", "whatsapp")
            .single()
            .then(({ data }: any) => {
              if (data?.setting_value) setWhatsapp(data.setting_value);
            }),
        );

        await Promise.all(promises);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            QR Code não encontrado
          </h1>
          <p className="text-gray-500 text-sm">
            Este QR Code não existe ou foi desativado.
          </p>
        </div>
      </div>
    );
  }

  const logoSrc = settings?.report_logo || settings?.logo_url;
  const companyName = settings?.company_name || "Curitiba Inox";
  const isFabricated = qrData.qr_type === "fabricated";

  const whatsappUrl = whatsapp.number
    ? `https://wa.me/55${whatsapp.number.replace(/\D/g, "")}?text=${encodeURIComponent(
        whatsapp.default_message
          ? whatsapp.default_message.replace(
              "{serial}",
              qrData.serial_number || qrData.code,
            )
          : `Olá! Estou entrando em contato sobre o equipamento ${qrData.serial_number || qrData.code}.`,
      )}`
    : null;

  const phoneUrl = settings?.company_phone
    ? `tel:${settings.company_phone.replace(/\D/g, "")}`
    : null;

  const websiteUrl = settings?.company_website
    ? settings.company_website.startsWith("http")
      ? settings.company_website
      : `https://${settings.company_website}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center gap-3">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={companyName}
              className="h-10 object-contain"
            />
          ) : (
            <h1 className="text-lg font-bold text-gray-800">{companyName}</h1>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Product Info Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-center space-y-1">
            {product ? (
              <>
                <h2 className="text-lg font-bold text-gray-900">
                  {product.name}
                </h2>
                {product.model_code && (
                  <p className="text-sm text-gray-500">
                    Modelo: {product.model_code}
                  </p>
                )}
              </>
            ) : (
              <h2 className="text-lg font-bold text-gray-900">
                {isFabricated
                  ? "Produto"
                  : qrData.category || "Assistência Técnica"}
              </h2>
            )}

            {qrData.serial_number && (
              <p className="text-xs text-gray-400 font-mono">
                S/N: {qrData.serial_number}
              </p>
            )}
            {qrData.lot_number && (
              <p className="text-xs text-gray-400">Lote: {qrData.lot_number}</p>
            )}

            {product?.description && (
              <p className="text-sm text-gray-600 mt-3 border-t pt-3">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 transition-all active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold text-sm">Falar pelo WhatsApp</div>
                <div className="text-xs text-green-100">
                  Tire dúvidas ou solicite assistência
                </div>
              </div>
            </a>
          )}

          {phoneUrl && (
            <a
              href={phoneUrl}
              className="flex items-center gap-3 bg-white hover:bg-gray-50 border rounded-xl p-4 transition-all active:scale-[0.98]"
            >
              <Phone className="h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <div className="font-semibold text-sm text-gray-800">
                  Ligar para a Empresa
                </div>
                <div className="text-xs text-gray-500">
                  {settings?.company_phone}
                </div>
              </div>
            </a>
          )}

          <a
            href="#"
            className="flex items-center gap-3 bg-white hover:bg-gray-50 border rounded-xl p-4 transition-all opacity-70"
          >
            <BookOpen className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="font-semibold text-sm text-gray-800">
                Manuais e Documentos
              </div>
              <div className="text-xs text-gray-500">Em breve</div>
            </div>
          </a>

          {isFabricated && (
            <a
              href="#"
              className="flex items-center gap-3 bg-white hover:bg-gray-50 border rounded-xl p-4 transition-all opacity-70"
            >
              <Wrench className="h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <div className="font-semibold text-sm text-gray-800">
                  Solicitar Assistência Técnica
                </div>
                <div className="text-xs text-gray-500">Em breve</div>
              </div>
            </a>
          )}

          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white hover:bg-gray-50 border rounded-xl p-4 transition-all active:scale-[0.98]"
            >
              <ShoppingCart className="h-5 w-5 shrink-0 text-purple-600" />
              <div>
                <div className="font-semibold text-sm text-gray-800">
                  Loja Online
                </div>
                <div className="text-xs text-gray-500">
                  {settings?.company_website}
                </div>
              </div>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4 pb-8">
          {companyName} &bull; Cozinhas Profissionais
        </div>
      </div>
    </div>
  );
}
