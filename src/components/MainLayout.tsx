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
  X,
  Shield,
  Car,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/curitiba-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [activeSection, setActiveSection] = useState<string | null>("Cadastros");
  const { isAdmin } = useUserRole();
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

  const menuSections: MenuSection[] = [
    {
      title: "Cadastros",
      icon: Users,
      items: [
        { icon: Building2, label: "Clientes e Fornecedores", to: "/cadastros/clientes" },
        { icon: Package, label: "Produtos", to: "/equipment" },
        { icon: Wrench, label: "Serviços", to: "/service-types" },
        { icon: Activity, label: "Status de Chamado", to: "/service-call-statuses" },
        { icon: Tags, label: "Categorias dos Produtos", to: "/categories" },
        { icon: Users, label: "Vendedores", to: "/sellers" },
        { icon: Package, label: "Embalagens", to: "/packaging" },
        { icon: Car, label: "Veículos", to: "/vehicles" },
        ...(isAdmin
          ? [
              { icon: Users, label: "Técnicos", to: "/technicians" },
              { icon: Shield, label: "Gerenciar Usuários", to: "/admin/users" },
            ]
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
        { icon: Wrench, label: "Manutenções de Veículos", to: "/vehicle-maintenances" },
        { icon: Car, label: "Deslocamentos", to: "/service-call-trips" },
      ],
    },
  ];

  // Auto-activate section containing active route
  useEffect(() => {
    const active = menuSections.find((section) =>
      section.items.some((item) => isActive(item.to))
    );
    if (active) {
      setActiveSection(active.title);
    }
  }, [location.pathname]);

  const activeMenuSection = menuSections.find((section) => section.title === activeSection);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-50 flex items-center px-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              {/* Mobile Sidebar Content */}
              <div className="flex h-full bg-sidebar">
                {/* Main Menu Column */}
                <div className="w-[90px] flex flex-col items-center py-6 bg-sidebar border-r border-sidebar-accent">
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 mb-6" />
                  <nav className="flex flex-col gap-2.5 flex-1">
                    {menuSections.map((section) => (
                      <Tooltip key={section.title}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setActiveSection(section.title)}
                            className={cn(
                              "w-16 h-16 flex items-center justify-center rounded-lg transition-all duration-200",
                              activeSection === section.title
                                ? "bg-white text-sidebar-primary shadow-sm"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-primary"
                            )}
                          >
                            <section.icon className="h-6 w-6" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{section.title}</TooltipContent>
                      </Tooltip>
                    ))}
                  </nav>
                </div>

                {/* Submenu Column */}
                <div className="flex-1 bg-white">
                  {activeMenuSection && (
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <h2 className="text-base font-semibold text-[#152752] mb-4 uppercase">
                          {activeMenuSection.title}
                        </h2>
                        <nav className="space-y-1">
                          {activeMenuSection.items.map((item) => (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors duration-200",
                                isActive(item.to)
                                  ? "bg-[#F5F6F8] text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary"
                                  : "text-[#434247] hover:bg-[#ECEFF1] hover:text-sidebar-primary"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </nav>
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <span className="ml-4 font-semibold text-lg">
            {settings?.company_name || "Curitiba Inox"}
          </span>
        </header>

        {/* Desktop Sidebar - Two Column Layout */}
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30">
          {/* Column 1: Main Menu (90px) */}
          <div className="w-[90px] flex flex-col items-center py-6 bg-sidebar border-r border-sidebar-accent">
            {/* Logo */}
            <img src={logoUrl} alt="Logo" className="w-16 h-16 mb-6" />

            {/* Main Menu Icons */}
            <nav className="flex flex-col gap-2.5 flex-1">
              {menuSections.map((section) => (
                <Tooltip key={section.title}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveSection(section.title)}
                      className={cn(
                        "w-16 h-16 flex items-center justify-center rounded-lg transition-all duration-200",
                        activeSection === section.title
                          ? "bg-white text-sidebar-primary shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-primary"
                      )}
                    >
                      <section.icon className="h-6 w-6" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{section.title}</TooltipContent>
                </Tooltip>
              ))}
            </nav>

            {/* Footer: Settings and Logout */}
            <div className="mt-auto space-y-2">
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate("/settings")}
                      className="h-12 w-12"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Configurações</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-12 w-12"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Column 2: Submenu Panel (Flexible width) */}
          <div
            className={cn(
              "bg-white border-r border-border transition-all duration-[250ms] ease-in-out overflow-hidden",
              activeSection ? "w-64 opacity-100" : "w-0 opacity-0"
            )}
          >
            {activeMenuSection && (
              <ScrollArea className="h-full">
                <div className="p-6">
                  {/* Section Title */}
                  <h2 className="text-base font-semibold text-[#152752] mb-4 uppercase">
                    {activeMenuSection.title}
                  </h2>

                  {/* Submenu Items */}
                  <nav className="space-y-1">
                    {activeMenuSection.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors duration-200",
                          isActive(item.to)
                            ? "bg-[#F5F6F8] text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary"
                            : "text-[#434247] hover:bg-[#ECEFF1] hover:text-sidebar-primary"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </ScrollArea>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 transition-all duration-[250ms]",
            "pt-16 lg:pt-0",
            activeSection ? "lg:ml-[346px]" : "lg:ml-[90px]"
          )}
        >
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
