import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  ClipboardList,
  Calendar,
  BarChart3,
  Menu,
  LogOut,
  Wrench,
  Package,
  Building2,
  FileText,
  Settings,
  Tags,
  FileCheck,
  Activity,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/curitiba-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUserRole } from "@/hooks/useUserRole";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

interface MenuSection {
  title: string;
  icon: any;
  items: MenuItem[];
}

interface MenuItem {
  to: string;
  icon: any;
  label: string;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["Cadastros"]);
  const { role } = useUserRole();
  const { settings } = useSystemSettings();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          navigate("/auth");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const menuSections: MenuSection[] = [
    {
      title: "Cadastros",
      icon: Users,
      items: [
        { icon: Building2, label: "Clientes e Fornecedores", to: "/clients" },
        { icon: Package, label: "Produtos", to: "/equipment" },
        { icon: Wrench, label: "Serviços", to: "/service-types" },
        { icon: Tags, label: "Categorias dos Produtos", to: "/categories" },
        { icon: Users, label: "Vendedores", to: "/sellers" },
        { icon: Package, label: "Embalagens", to: "/packaging" },
        ...(role === "admin"
          ? [{ icon: Users, label: "Técnicos", to: "/technicians" }]
          : []),
        { icon: FileText, label: "Checklists", to: "/checklists" },
      ],
    },
    {
      title: "Serviços",
      icon: Wrench,
      items: [
        { icon: FileText, label: "Contratos", to: "/contracts" },
        { icon: ClipboardList, label: "Ordens de Serviço", to: "/service-calls" },
        { icon: FileCheck, label: "Notas de Serviço", to: "/service-notes" },
        { icon: BarChart3, label: "Relatórios", to: "/service-reports" },
      ],
    },
    {
      title: "Agenda",
      icon: Calendar,
      items: [
        { icon: Calendar, label: "Compromissos", to: "/schedule" },
        { icon: Wrench, label: "Técnicos em Campo", to: "/technicians" },
      ],
    },
    {
      title: "Relatórios",
      icon: BarChart3,
      items: [
        { icon: BarChart3, label: "Dashboard", to: "/dashboard" },
        { icon: Activity, label: "Indicadores Técnicos", to: "/technical-indicators" },
        { icon: DollarSign, label: "Financeiro", to: "/financial" },
      ],
    },
  ];

  // Verificar se algum item da seção está ativo e expandir automaticamente
  useEffect(() => {
    menuSections.forEach(section => {
      const hasActiveItem = section.items.some(item => isActive(item.to));
      if (hasActiveItem && !expandedSections.includes(section.title)) {
        setExpandedSections(prev => [...prev, section.title]);
      }
    });
  }, [location.pathname]);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center py-6 px-4">
        <img 
          src={logoUrl} 
          alt="Curitiba Inox" 
          className={cn(
            "transition-all duration-200",
            isCollapsed && !mobile ? "w-10" : "w-40"
          )}
        />
      </div>

      {/* Menu */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-2">
          {menuSections.map((section) => {
            const isExpanded = expandedSections.includes(section.title);
            const hasActiveItem = section.items.some(item => isActive(item.to));
            
            return (
              <div key={section.title} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg",
                    "font-medium transition-all duration-200 sidebar-item",
                    hasActiveItem && "text-sidebar-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="h-5 w-5 flex-shrink-0" />
                    {(!isCollapsed || mobile) && (
                      <span className="text-sm">{section.title}</span>
                    )}
                  </div>
                  {(!isCollapsed || mobile) && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  )}
                </button>

                {/* Section Items */}
                {isExpanded && (!isCollapsed || mobile) && (
                  <div className="space-y-1 pl-3">
                    {section.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => mobile && setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg",
                          "text-sm transition-all duration-200 sidebar-item",
                          isActive(item.to) && "sidebar-item-active"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 space-y-3 border-t border-sidebar-border">
        {(!isCollapsed || mobile) && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Expandir menu</span>
            <Switch
              checked={!isCollapsed}
              onCheckedChange={(checked) => setIsCollapsed(!checked)}
            />
          </div>
        )}
        
        {role === "admin" && (
          <Link to="/settings">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                isCollapsed && !mobile && "justify-center px-2"
              )}
            >
              <Settings className="h-4 w-4" />
              {(!isCollapsed || mobile) && <span>Configurações</span>}
            </Button>
          </Link>
        )}
        
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 text-destructive hover:text-destructive",
            isCollapsed && !mobile && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4" />
          {(!isCollapsed || mobile) && <span>Sair</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar transition-all duration-200",
          isCollapsed ? "w-16" : "w-70"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 border-b bg-card">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-sidebar">
            <SidebarContent mobile />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold">
          {settings?.company_name || "Curitiba Inox"}
        </h1>
      </div>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto",
        "pt-16 lg:pt-0"
      )}>
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
