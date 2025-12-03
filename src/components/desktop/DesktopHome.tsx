import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHomeStats } from "@/hooks/useHomeStats";
import { 
  ClipboardList, 
  AlertTriangle, 
  CalendarDays, 
  Users, 
  Plus,
  FileText,
  Calendar,
  Wrench,
  BarChart3,
  Settings,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  onClick: () => void;
}

const StatCard = ({ title, value, icon, colorClass, onClick }: StatCardProps) => (
  <Card 
    className="cursor-pointer hover:shadow-card-hover transition-all duration-200 group"
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const QuickAction = ({ icon, label, onClick }: QuickActionProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
  >
    <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
      {icon}
    </div>
    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
      {label}
    </span>
  </button>
);

const DesktopHome = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useHomeStats();

  const statCards = [
    {
      title: "Chamados em Aberto",
      value: stats?.openCallsCount || 0,
      icon: <ClipboardList className="h-6 w-6 text-blue-600" />,
      colorClass: "bg-blue-100",
      onClick: () => navigate("/service-calls"),
    },
    {
      title: "Em Atraso",
      value: stats?.overdueCallsCount || 0,
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      colorClass: "bg-red-100",
      onClick: () => navigate("/service-calls"),
    },
    {
      title: "Chamados Hoje",
      value: stats?.todayCallsCount || 0,
      icon: <CalendarDays className="h-6 w-6 text-green-600" />,
      colorClass: "bg-green-100",
      onClick: () => navigate("/schedule"),
    },
    {
      title: "Total de Clientes",
      value: stats?.clientsCount || 0,
      icon: <Users className="h-6 w-6 text-primary" />,
      colorClass: "bg-primary/10",
      onClick: () => navigate("/cadastros/clientes"),
    },
  ];

  const quickActions = [
    { icon: <ClipboardList className="h-5 w-5" />, label: "Chamados", onClick: () => navigate("/service-calls") },
    { icon: <FileText className="h-5 w-5" />, label: "Cadastros", onClick: () => navigate("/cadastros/clientes") },
    { icon: <Calendar className="h-5 w-5" />, label: "Agenda", onClick: () => navigate("/schedule") },
    { icon: <Wrench className="h-5 w-5" />, label: "Equipamentos", onClick: () => navigate("/equipment") },
    { icon: <BarChart3 className="h-5 w-5" />, label: "Relatórios", onClick: () => navigate("/dashboard") },
    { icon: <Settings className="h-5 w-5" />, label: "Configurações", onClick: () => navigate("/settings") },
  ];

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + "T00:00:00"), "dd/MM", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Header com CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => navigate("/service-calls/new")}
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Abrir novo chamado
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      )}

      {/* Grid de Conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Compromissos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Próximos Compromissos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : stats?.upcomingCalls && stats.upcomingCalls.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingCalls.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => navigate(`/service-calls/${call.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="text-xs font-medium text-muted-foreground">
                        {formatDate(call.scheduled_date)}
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {call.scheduled_time}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        OS #{call.os_number} - {call.client_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {call.equipment_description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Técnico: {call.technician_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum compromisso agendado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <QuickAction key={action.label} {...action} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DesktopHome;
