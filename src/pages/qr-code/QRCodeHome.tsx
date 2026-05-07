import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useQRStats } from "@/hooks/useQRCodes";
import { QRBatchesDialog } from "@/components/qr-code/QRBatchesDialog";
import {
  QrCode,
  Wrench,
  LayoutTemplate,
  Package,
  Settings,
} from "lucide-react";

const QRCodeHome = () => {
  const navigate = useNavigate();
  const { data: stats } = useQRStats();
  const [batchFilter, setBatchFilter] = useState<"all" | "today" | null>(null);

  const menuItems = [
    {
      title: "QR Code -- Produtos Fabricados",
      description: "Gerar etiquetas com lote, serial e pagina de destino",
      icon: <QrCode className="h-5 w-5" />,
      iconBg: "bg-blue-50 text-blue-600",
      badges: ["Lote & Serial", "Pagina Hub"],
      badgeColor: "bg-blue-50 text-blue-600",
      path: "/qr-code/fabricados",
    },
    {
      title: "QR Code -- Assistencia Tecnica",
      description: "Gerar QR Codes para etiquetar equipamentos em campo",
      icon: <Wrench className="h-5 w-5" />,
      iconBg: "bg-green-50 text-green-600",
      badges: ["Geracao em lote", "Sem vinculo previo"],
      badgeColor: "bg-green-50 text-green-600",
      path: "/qr-code/assistencia",
    },
    {
      title: "Templates de Etiquetas",
      description: "Criar layouts personalizados para impressao",
      icon: <LayoutTemplate className="h-5 w-5" />,
      iconBg: "bg-amber-50 text-amber-600",
      badges: ["Editor visual", "Tamanho livre"],
      badgeColor: "bg-amber-50 text-amber-600",
      path: "/qr-code/templates",
    },
    {
      title: "Cadastro de Produtos / Modelos",
      description: "Definir produtos que receberao QR Code",
      icon: <Package className="h-5 w-5" />,
      iconBg: "bg-gray-100 text-gray-500",
      path: "/qr-code/produtos",
    },
    {
      title: "Configuracoes",
      description: "Logo, WhatsApp, pagina hub, lotes, serial",
      icon: <Settings className="h-5 w-5" />,
      iconBg: "bg-gray-100 text-gray-500",
      path: "/qr-code/configuracoes",
    },
  ];

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <PageHeader title="Modulo QR Code" />

        <div className="grid grid-cols-3 gap-3">
          <div
            onClick={() => setBatchFilter("all")}
            className="bg-white rounded-lg border p-4 text-center cursor-pointer transition-all hover:border-primary hover:shadow-sm"
          >
            <div className="text-2xl font-bold text-primary">
              {stats?.totalGenerated ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">QR Gerados</div>
          </div>
          <div
            onClick={() => setBatchFilter("today")}
            className="bg-white rounded-lg border p-4 text-center cursor-pointer transition-all hover:border-primary hover:shadow-sm"
          >
            <div className="text-2xl font-bold text-primary">
              {stats?.todayGenerated ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Etiquetas Hoje</div>
          </div>
          <div
            onClick={() => navigate("/qr-code/templates")}
            className="bg-white rounded-lg border p-4 text-center cursor-pointer transition-all hover:border-primary hover:shadow-sm"
          >
            <div className="text-2xl font-bold text-primary">
              {stats?.totalTemplates ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Templates</div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            O que deseja fazer?
          </h3>
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-lg border-2 border-transparent hover:border-primary p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconBg}`}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>
              {item.badges && (
                <div className="flex gap-1.5 mt-3">
                  {item.badges.map((badge) => (
                    <span
                      key={badge}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <QRBatchesDialog
        open={!!batchFilter}
        onClose={() => setBatchFilter(null)}
        filter={batchFilter || "all"}
      />
    </MainLayout>
  );
};

export default QRCodeHome;
