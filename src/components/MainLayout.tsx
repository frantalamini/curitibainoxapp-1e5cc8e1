import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Home,
  Users,
  Building2,
  Package,
  Wrench,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Calendar,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Tags,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import logo from "@/assets/logo.png";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const toggleSection = (title: string) => {
    setExpandedSection(prev => prev === title ? null : title);
  };


  const menuSections = [
    {
      title: "CADASTRO",
      items: [
        ...(isAdmin ? [{ to: "/technicians", icon: Wrench, label: "Técnicos" }] : []),
        { to: "/clients", icon: Building2, label: "Clientes / Fornecedores" },
        { to: "/service-types", icon: Tags, label: "Tipos de Serviço" },
        { to: "/checklists", icon: ClipboardList, label: "Checklists" },
      ]
    },
    {
      title: "CHAMADOS",
      items: [
        { to: "/service-calls", icon: Package, label: "Todos os Chamados" },
        { to: "/service-calls?status=pending", icon: Clock, label: "Aguardando Início" },
        { to: "/service-calls?status=in_progress", icon: Activity, label: "Em Andamento" },
        { to: "/service-calls?status=on_hold", icon: AlertCircle, label: "Com Pendências" },
        { to: "/service-calls?status=completed", icon: CheckCircle, label: "Finalizados" },
      ]
    },
    {
      title: "AGENDA",
      items: [
        { to: "/schedule", icon: Calendar, label: "Calendário" },
      ]
    },
    {
      title: "RELATÓRIOS",
      items: [
        { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
      ]
    }
  ];

  const NavItems = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const isActiveItem = (itemTo: string) => {
      const itemPath = new URL(itemTo, window.location.origin);
      return location.pathname === itemPath.pathname && 
             location.search === itemPath.search;
    };

    const getActiveSection = () => {
      const section = menuSections.find(s =>
        s.items.some(item => isActiveItem(item.to))
      );
      return section?.title || null;
    };

    useEffect(() => {
      const current = getActiveSection();
      if (current && expandedSection === current) {
        setActiveSection(current);
      }
    }, [location.pathname, expandedSection]);

    return (
      <div className="flex gap-4">
        {/* COLUNA ESQUERDA: Títulos principais */}
        <div className="w-48 space-y-2">
          {menuSections.map((section) => {
            const isExpanded = expandedSection === section.title;
            const isCurrent = getActiveSection() === section.title;

            return (
              <button
                key={section.title}
                onClick={() => toggleSection(section.title)}
                onMouseEnter={() => {
                  setExpandedSection(section.title);
                }}
                onMouseLeave={() => {
                  if (!isCurrent) {
                    setExpandedSection(null);
                  }
                }}
                className={`
                  w-full text-left px-4 py-3 rounded-lg font-bold text-sm
                  transition-all duration-200 flex items-center justify-between
                  ${isCurrent ? "text-primary" : "text-foreground hover:text-primary"}
                `}
              >
                <span className="uppercase tracking-wider">{section.title}</span>
                {isExpanded && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* COLUNA DIREITA: Sub-itens */}
        <div className="flex-1">
          {menuSections.map((section) => {
            const isExpanded = expandedSection === section.title;
            
            if (!isExpanded) return null;

            return (
              <div 
                key={section.title}
                className="space-y-1 animate-fade-in"
              >
                {section.items.map((item) => {
                  const itemActive = isActiveItem(item.to);
                  
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-lg 
                        transition-all text-sm
                        ${itemActive
                          ? "text-primary font-bold"
                          : "text-foreground hover:text-primary"
                        }
                      `}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-card">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex items-center justify-center h-20 border-b px-4">
            <img src={logo} alt="Curitiba Inox" className="h-12 object-contain" />
          </div>
          <nav className="flex-1 px-4 py-6">
            <NavItems />
          </nav>
          <div className="p-4 border-t space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5 mr-3" />
              Configurações
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Button>
            <div className="text-sm text-muted-foreground px-4 pt-2">
              {user?.email}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center justify-between px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center h-20 border-b">
                <img src={logo} alt="Curitiba Inox" className="h-12 object-contain" />
              </div>
              <nav className="flex-1 px-4 py-6 overflow-y-auto">
                <NavItems />
              </nav>
              <div className="p-4 border-t space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings");
                  }}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Configurações
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sair
                </Button>
                <div className="text-sm text-muted-foreground px-4 pt-2">
                  {user?.email}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <img src={logo} alt="Curitiba Inox" className="h-10 object-contain" />
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:pl-80 pt-16 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
