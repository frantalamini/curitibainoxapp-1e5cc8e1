import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useQRTemplates } from "@/hooks/useQRTemplates";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, ChevronRight, ArrowLeft } from "lucide-react";

const QRTemplates = () => {
  const navigate = useNavigate();
  const { templates, isLoading } = useQRTemplates();

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
          title="Templates de Etiquetas"
          actionLabel="Novo Template"
          onAction={() => navigate("/qr-code/templates/novo")}
        />

        <p className="text-sm text-muted-foreground">
          Crie layouts personalizados. Toda etiqueta inclui{" "}
          <strong>logo + QR Code</strong> obrigatoriamente.
        </p>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum template criado</p>
            <p className="text-sm mt-1">
              Crie seu primeiro template de etiqueta
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const elemCount = (template.text_elements?.length || 0) + 2; // +2 for logo and QR
              const ratio = template.width_cm / template.height_cm;
              const previewWidth = Math.min(200, 60 * ratio);
              const previewHeight = previewWidth / ratio;

              return (
                <div
                  key={template.id}
                  onClick={() => navigate(`/qr-code/templates/${template.id}`)}
                  className="bg-white rounded-lg border p-4 cursor-pointer hover:border-primary hover:bg-blue-50/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      {template.name}
                    </span>
                    <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                      {template.width_cm} x {template.height_cm} cm
                    </span>
                  </div>

                  {/* Mini preview */}
                  <div className="flex justify-center py-3">
                    <div
                      style={{ width: previewWidth, height: previewHeight }}
                      className="border border-dashed border-gray-300 rounded bg-gray-50 relative overflow-hidden"
                    >
                      {template.bg_enabled && (
                        <div
                          className="absolute left-0 top-0 h-full"
                          style={{
                            width: `${template.bg_width_pct}%`,
                            background: template.bg_color,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border border-gray-400 rounded-sm bg-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {elemCount} elementos
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {template.times_used > 0
                        ? `Usado ${template.times_used}x`
                        : "Novo"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default QRTemplates;
