import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportData {
  osNumber: number;
  clientName: string;
  clientPhone: string;
  equipmentDescription: string;
  scheduledDate: string;
  status: string;
  pdfUrl: string;
}

export default function RelatorioOS() {
  const { osNumber } = useParams<{ osNumber: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!osNumber) {
        setError("Número da OS não fornecido");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Call edge function to get report
        const { data, error: functionError } = await supabase.functions.invoke(
          "get-os-report",
          {
            body: { osNumber: parseInt(osNumber) },
          }
        );

        if (functionError) {
          console.error("Error calling edge function:", functionError);
          setError("Erro ao buscar relatório. Tente novamente.");
          return;
        }

        if (data.error) {
          setError(data.error);
          return;
        }

        setReportData(data);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Erro inesperado ao carregar relatório");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [osNumber]);

  const handleDownload = () => {
    if (reportData?.pdfUrl) {
      window.open(reportData.pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Carregando relatório...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6" />
              Relatório não encontrado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || "Relatório não encontrado. Entre em contato com o suporte da Curitiba Inox."}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Voltar para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Curitiba Inox</h1>
              <p className="text-sm opacity-90 mt-1">Assistência Técnica Especializada</p>
            </div>
            <img 
              src="/src/assets/curitiba-logo.png" 
              alt="Curitiba Inox" 
              className="h-16 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="text-center border-b">
            <CardTitle className="text-2xl">
              Relatório da OS #{reportData.osNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Assistência Técnica • Curitiba Inox
            </p>
          </CardHeader>

          <CardContent className="space-y-6 py-6">
            {/* Client Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{reportData.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-semibold">{reportData.clientPhone}</p>
              </div>
            </div>

            {/* Equipment & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Equipamento</p>
                <p className="font-semibold">{reportData.equipmentDescription}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Agendada</p>
                <p className="font-semibold">
                  {format(new Date(reportData.scheduledDate), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            {/* Download Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleDownload}
                size="lg"
                className="w-full md:w-auto"
              >
                <FileDown className="w-5 h-5 mr-2" />
                Baixar Relatório em PDF
              </Button>
            </div>

            {/* PDF Preview */}
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">Pré-visualização do Relatório</p>
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                <iframe
                  src={reportData.pdfUrl}
                  className="w-full h-[600px]"
                  title="Relatório PDF"
                />
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center text-xs text-muted-foreground pt-4 border-t">
              <p>
                Para dúvidas ou mais informações, entre em contato com a Curitiba Inox.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Curitiba Inox - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
