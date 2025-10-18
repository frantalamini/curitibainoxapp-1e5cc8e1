import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const ServiceCalls = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Chamados Técnicos</h1>
          <Button onClick={() => navigate("/service-calls/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Chamado
          </Button>
        </div>

        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>Página em desenvolvimento</p>
          <p className="text-sm mt-2">Em breve você poderá gerenciar os chamados técnicos aqui</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default ServiceCalls;
