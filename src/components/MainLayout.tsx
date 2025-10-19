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
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

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
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  useEffect(() => {
    const activeSection = menuSections.find(section =>
      section.items.some(item => {
        const itemPath = new URL(item.to, window.location.origin);
        return location.pathname === itemPath.pathname;
      })
    );
    
    if (activeSection && !expandedSections.includes(activeSection.title)) {
      setExpandedSections(prev => [...prev, activeSection.title]);
    }
  }, [location.pathname]);

  const menuSections = [
    {
      title: "CADASTRO",
      items: [
        ...(isAdmin ? [{ to: "/technicians", icon: Wrench, label: "Técnicos" }] : []),
        { to: "/clients", icon: Building2, label: "Clientes / Fornecedores" },
      ]
    },
    {
      title: "CHAMADOS",
      items: [
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
    }
  ];

  const NavItems = () => {
    const isActiveSection = (section: typeof menuSections[0]) => {
      return section.items.some(item => {
        const itemPath = new URL(item.to, window.location.origin);
        return location.pathname === itemPath.pathname;
      });
    };

    const isActiveItem = (itemTo: string) => {
      const itemPath = new URL(itemTo, window.location.origin);
      return location.pathname === itemPath.pathname && 
             location.search === itemPath.search;
    };

    return (
      <>
        {menuSections.map((section) => {
          const sectionActive = isActiveSection(section);
          const isExpanded = expandedSections.includes(section.title);

          return (
            <div key={section.title} className="mb-2">
            <button
              onClick={() => toggleSection(section.title)}
              onMouseEnter={() => {
                if (!expandedSections.includes(section.title)) {
                  setExpandedSections(prev => [...prev, section.title]);
                }
              }}
              className="w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-all duration-200 flex items-center justify-between text-foreground hover:text-primary"
            >
              <span className="uppercase tracking-wider">{section.title}</span>
              <ChevronDown 
                className={`h-4 w-4 transition-transform duration-300 ${
                  isExpanded ? "rotate-180" : ""
                }`} 
              />
            </button>

              <div
                className={`
                  overflow-hidden transition-all duration-300
                  ${isExpanded ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"}
                `}
              >
                <div className="space-y-1 pl-2">
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
              </div>
            </div>
          );
        })}
      </>
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
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-card">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex items-center justify-center h-20 border-b px-4">
            <img src={logo} alt="Curitiba Inox" className="h-12 object-contain" />
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
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
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center h-20 border-b">
                <img src={logo} alt="Curitiba Inox" className="h-12 object-contain" />
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
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
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
