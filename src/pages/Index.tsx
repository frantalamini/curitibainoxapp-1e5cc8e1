import { useDashboardCounts, useRecentClients, useRecentEquipment } from "@/hooks/useDashboardCounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Smartphone, Wrench, Plus, ClipboardList, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

const Index = () => {
  const navigate = useNavigate();
  
  // Queries otimizadas - apenas contagens, não carrega arrays completos
  const { data: counts, isLoading: countsLoading } = useDashboardCounts();
  const { data: recentClients, isLoading: clientsLoading } = useRecentClients();
  const { data: recentEquipment, isLoading: equipmentLoading } = useRecentEquipment();

  const stats = [
    {
      title: "Total de Clientes",
      value: counts?.clientsCount || 0,
      icon: Users,
      action: () => navigate("/clients"),
      color: "text-blue-600",
    },
    {
      title: "Equipamentos",
      value: counts?.equipmentCount || 0,
      icon: Smartphone,
      action: () => navigate("/equipment"),
      color: "text-green-600",
    },
    {
      title: "Técnicos Ativos",
      value: counts?.activeTechniciansCount || 0,
      icon: Wrench,
      action: () => navigate("/technicians"),
      color: "text-orange-600",
    },
  ];

  const isLoading = countsLoading;

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
                  {clientsLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : recentClients && recentClients.length > 0 ? (
                    recentClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex justify-between items-center py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{client.full_name}</p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Últimos Equipamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {equipmentLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : recentEquipment && recentEquipment.length > 0 ? (
                    recentEquipment.map((eq) => (
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
                    ))
                  ) : (
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
