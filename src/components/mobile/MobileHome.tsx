import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useHomeStats } from "@/hooks/useHomeStats";
import { Icon, type IconName } from "@/components/ui/icons";
import defaultLogo from "@/assets/logo.png";

interface NavItem {
  icon: IconName;
  label: string;
  path: string;
  angle: number;
}

interface QuickStatCardProps {
  label: string;
  value?: number;
  icon: IconName;
  color?: "primary" | "destructive" | "success";
  onClick: () => void;
}

const MobileHome = () => {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const { data: stats, isLoading } = useHomeStats();
  
  const logoUrl = settings?.logo_url || defaultLogo;

  const navItems: NavItem[] = [
    { icon: "chamadosTecnicos", label: "Chamados", path: "/service-calls", angle: 0 },
    { icon: "clientesFornecedores", label: "Clientes", path: "/cadastros/clientes", angle: 60 },
    { icon: "agenda", label: "Agenda", path: "/schedule", angle: 120 },
    { icon: "equipamentos", label: "Equipamentos", path: "/equipment", angle: 180 },
    { icon: "relatorios", label: "Relatórios", path: "/dashboard", angle: 240 },
    { icon: "financeiro", label: "Financeiro", path: "/financeiro", angle: 300 },
  ];

  const getPosition = (angle: number, radius: number) => {
    const radian = (angle - 90) * (Math.PI / 180);
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;
    return { x, y };
  };

  const circleRadius = 120;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="pt-8 pb-4 px-6">
        <h1 className="text-lg font-semibold text-foreground text-center">
          Curitiba Inox
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-0.5">
          Assistência Técnica
        </p>
      </header>

      {/* Main Navigation Circle */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div 
          className="relative"
          style={{ 
            width: circleRadius * 2 + 100, 
            height: circleRadius * 2 + 100 
          }}
        >
          {/* Subtle gradient ring */}
          <div 
            className="absolute rounded-full bg-gradient-to-br from-primary/5 via-transparent to-primary/10"
            style={{
              width: circleRadius * 2 + 90,
              height: circleRadius * 2 + 90,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />

          {/* Center Logo with Glass-morphism */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-28 h-28 rounded-full bg-white/90 backdrop-blur-sm shadow-elevated border border-primary/10 flex items-center justify-center p-4 overflow-hidden">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Navigation Items */}
          {navItems.map((item, index) => {
            const pos = getPosition(item.angle, circleRadius);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="absolute flex flex-col items-center justify-center transition-all duration-200 active:scale-95 group animate-fade-in opacity-0"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${index * 80}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <div className="w-14 h-14 rounded-2xl bg-card/95 backdrop-blur-sm shadow-card border border-border/50 flex items-center justify-center text-primary group-hover:shadow-card-hover group-hover:border-primary/40 group-active:bg-primary/5 transition-all duration-200">
                  <Icon name={item.icon} size="lg" color="primary" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary CTA Button */}
        <div className="w-full max-w-sm mt-8 px-4 animate-fade-in opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <Button 
            onClick={() => navigate("/service-calls/new")}
            className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl gap-2"
            size="lg"
          >
            <Icon name="mais" size="md" color="white" />
            Abrir novo chamado
          </Button>
        </div>

        {/* Quick Stats Cards */}
        <div className="w-full max-w-sm mt-6 px-4 animate-fade-in opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          <div className="grid grid-cols-3 gap-3">
            <QuickStatCard 
              label="Pendentes" 
              value={stats?.openCallsCount}
              icon="chamadosTecnicos"
              color="primary"
              onClick={() => navigate("/service-calls")} 
            />
            <QuickStatCard 
              label="Hoje" 
              value={stats?.todayCallsCount}
              icon="agenda"
              color="success"
              onClick={() => navigate("/schedule")} 
            />
            <QuickStatCard 
              label="Em Atraso" 
              value={stats?.overdueCallsCount}
              icon="alerta"
              color="destructive"
              onClick={() => navigate("/service-calls")} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

const QuickStatCard = ({ label, value, icon, color = "primary", onClick }: QuickStatCardProps) => {
  const colorClasses = {
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-green-600"
  };

  return (
    <button
      onClick={onClick}
      className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 text-center hover:border-primary/30 hover:shadow-card transition-all duration-200 active:scale-95 flex flex-col items-center gap-1"
    >
      <Icon name={icon} size="sm" color={color} />
      <span className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value ?? '-'}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </button>
  );
};

export default MobileHome;
