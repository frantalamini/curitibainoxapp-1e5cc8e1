import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Icon, type IconName } from "@/components/ui/icons";
import defaultLogo from "@/assets/logo.png";

interface NavItem {
  icon: IconName;
  label: string;
  path: string;
  angle: number;
}

const MobileHome = () => {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  
  const logoUrl = settings?.logo_url || defaultLogo;

  const navItems: NavItem[] = [
    { icon: "chamadosTecnicos", label: "Chamados", path: "/service-calls", angle: 0 },
    { icon: "clientesFornecedores", label: "Cadastros", path: "/cadastros/clientes", angle: 60 },
    { icon: "agenda", label: "Agenda", path: "/schedule", angle: 120 },
    { icon: "equipamentos", label: "Equipamentos", path: "/equipment", angle: 180 },
    { icon: "relatorios", label: "Relatórios", path: "/dashboard", angle: 240 },
    { icon: "configuracoes", label: "Configurações", path: "/settings", angle: 300 },
  ];

  const getPosition = (angle: number, radius: number) => {
    const radian = (angle - 90) * (Math.PI / 180);
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;
    return { x, y };
  };

  const circleRadius = 120;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="pt-6 pb-2 px-6">
        <p className="text-sm text-muted-foreground text-center">
          Assistência Técnica
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div 
          className="relative"
          style={{ 
            width: circleRadius * 2 + 100, 
            height: circleRadius * 2 + 100 
          }}
        >
          <div 
            className="absolute inset-0 rounded-full border-2 border-dashed border-border/50"
            style={{
              width: circleRadius * 2 + 80,
              height: circleRadius * 2 + 80,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-24 h-24 rounded-full bg-card shadow-elevated border-2 border-primary/20 flex items-center justify-center p-3 overflow-hidden">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {navItems.map((item) => {
            const pos = getPosition(item.angle, circleRadius);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="absolute flex flex-col items-center justify-center transition-all duration-200 active:scale-95 group"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="w-14 h-14 rounded-2xl bg-card shadow-card border border-border flex items-center justify-center text-primary group-hover:shadow-card-hover group-hover:border-primary/30 group-active:bg-accent transition-all duration-200">
                  <Icon name={item.icon} size="lg" color="primary" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-full max-w-sm mt-8 px-4">
          <Button 
            onClick={() => navigate("/service-calls/new")}
            className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl gap-2"
            size="lg"
          >
            <Icon name="mais" size="md" color="white" />
            Abrir novo chamado
          </Button>
        </div>

        <div className="w-full max-w-sm mt-6 px-4">
          <div className="grid grid-cols-3 gap-3">
            <QuickStatCard 
              label="Pendentes" 
              onClick={() => navigate("/service-calls")} 
            />
            <QuickStatCard 
              label="Hoje" 
              onClick={() => navigate("/schedule")} 
            />
            <QuickStatCard 
              label="Dashboard" 
              onClick={() => navigate("/dashboard")} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

const QuickStatCard = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="bg-card border border-border rounded-xl p-3 text-center hover:border-primary/30 hover:shadow-card transition-all duration-200 active:scale-95"
  >
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
  </button>
);

export default MobileHome;
