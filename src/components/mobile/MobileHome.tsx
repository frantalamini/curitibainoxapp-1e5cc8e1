import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { 
  ClipboardList, 
  Users, 
  Calendar, 
  Smartphone, 
  FileText, 
  Settings,
  Plus
} from "lucide-react";
import defaultLogo from "@/assets/logo.png";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  angle: number; // Position angle in degrees
}

const MobileHome = () => {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  
  const logoUrl = settings?.logo_url || defaultLogo;

  const navItems: NavItem[] = [
    { icon: <ClipboardList className="h-6 w-6" />, label: "Chamados", path: "/service-calls", angle: 0 },
    { icon: <Users className="h-6 w-6" />, label: "Cadastros", path: "/cadastros/clientes", angle: 60 },
    { icon: <Calendar className="h-6 w-6" />, label: "Agenda", path: "/schedule", angle: 120 },
    { icon: <Smartphone className="h-6 w-6" />, label: "Equipamentos", path: "/equipment", angle: 180 },
    { icon: <FileText className="h-6 w-6" />, label: "Relatórios", path: "/dashboard", angle: 240 },
    { icon: <Settings className="h-6 w-6" />, label: "Configurações", path: "/settings", angle: 300 },
  ];

  // Calculate position for each nav item around the circle
  const getPosition = (angle: number, radius: number) => {
    const radian = (angle - 90) * (Math.PI / 180); // Start from top
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;
    return { x, y };
  };

  const circleRadius = 120; // Distance from center

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with subtle branding */}
      <header className="pt-6 pb-2 px-6">
        <p className="text-sm text-muted-foreground text-center">
          Assistência Técnica
        </p>
      </header>

      {/* Main circular navigation area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Circular Navigation Container */}
        <div 
          className="relative"
          style={{ 
            width: circleRadius * 2 + 100, 
            height: circleRadius * 2 + 100 
          }}
        >
          {/* Decorative ring */}
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

          {/* Center Logo */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          >
            <div className="w-24 h-24 rounded-full bg-card shadow-elevated border-2 border-primary/20 flex items-center justify-center p-3 overflow-hidden">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Navigation Items */}
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
                {/* Icon container */}
                <div className="w-14 h-14 rounded-2xl bg-card shadow-card border border-border flex items-center justify-center text-primary group-hover:shadow-card-hover group-hover:border-primary/30 group-active:bg-accent transition-all duration-200">
                  {item.icon}
                </div>
                {/* Label */}
                <span className="mt-1.5 text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main CTA Button */}
        <div className="w-full max-w-sm mt-8 px-4">
          <Button 
            onClick={() => navigate("/service-calls/new")}
            className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl gap-2"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Abrir novo chamado
          </Button>
        </div>

        {/* Quick stats summary (optional) */}
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
