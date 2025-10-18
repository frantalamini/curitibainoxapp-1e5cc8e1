import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const ServiceCallForm = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/service-calls")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Novo Chamado Técnico</h1>
        </div>

        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>Formulário em desenvolvimento</p>
          <p className="text-sm mt-2">Em breve você poderá criar chamados técnicos aqui</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default ServiceCallForm;
