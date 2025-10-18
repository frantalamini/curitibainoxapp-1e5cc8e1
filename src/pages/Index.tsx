import { useClients } from "@/hooks/useClients";
import { useEquipment } from "@/hooks/useEquipment";
import { useTechnicians } from "@/hooks/useTechnicians";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Smartphone, Wrench, Plus, ClipboardList, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

const Index = () => {
  const navigate = useNavigate();
  const { clients, isLoading: clientsLoading } = useClients();
  const { equipment, isLoading: equipmentLoading } = useEquipment();
  const { technicians, isLoading: techniciansLoading } = useTechnicians();

  const stats = [
    {
      title: "Total de Clientes",
      value: clients?.length || 0,
      icon: Users,
      action: () => navigate("/clients"),
      color: "text-blue-600",
    },
    {
      title: "Equipamentos",
      value: equipment?.length || 0,
      icon: Smartphone,
      action: () => navigate("/equipment"),
      color: "text-green-600",
    },
    {
      title: "Técnicos Ativos",
      value: technicians?.filter((t) => t.active).length || 0,
      icon: Wrench,
      action: () => navigate("/technicians"),
      color: "text-orange-600",
    },
  ];

  const isLoading = clientsLoading || equipmentLoading || techniciansLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div>Carregando...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat) => (
                <Card
                  key={stat.title}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={stat.action}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => navigate("/clients/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
                <Button onClick={() => navigate("/equipment/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Equipamento
                </Button>
                <Button onClick={() => navigate("/technicians/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Técnico
                </Button>
                <Button onClick={() => navigate("/service-calls/new")}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Novo Chamado Técnico
                </Button>
                <Button onClick={() => navigate("/schedule")}>

                  <Calendar className="h-4 w-4 mr-2" />
                  Agenda Técnica
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Últimos Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  {clients?.slice(0, 5).map((client) => (
                    <div
                      key={client.id}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{client.full_name}</p>
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                      </div>
                    </div>
                  ))}
                  {clients?.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Últimos Equipamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {equipment?.slice(0, 5).map((eq) => (
                    <div
                      key={eq.id}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{eq.brand} {eq.model}</p>
                        <p className="text-sm text-muted-foreground">
                          {eq.serial_number || eq.imei || "Sem serial"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {equipment?.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
