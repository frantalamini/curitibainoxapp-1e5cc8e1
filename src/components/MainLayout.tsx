import { ReactNode, useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/curitiba-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  const [isPinned, setIsPinned] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [isHoveringMenu, setIsHoveringMenu] = useState(false);
  const [isHoveringSubmenu, setIsHoveringSubmenu] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
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

  const getActiveSectionFromRoute = () => {
    return menuSections.find((section) =>
      section.items.some((item) => isActive(item.to))
    );
  };

  const handleSectionMouseEnter = (sectionTitle: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredSection(sectionTitle);
  };

  const handleMenuMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPinned && !isHoveringSubmenu) {
        setHoveredSection(null);
      }
    }, 150);
  };

  const handleSubmenuMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHoveringSubmenu(true);
  };

  const handleSubmenuMouseLeave = () => {
    setIsHoveringSubmenu(false);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPinned && !isHoveringMenu) {
        setHoveredSection(null);
      }
    }, 150);
  };

  const activeSection = getActiveSectionFromRoute();
  const isMenuExpanded = isPinned || isHoveringMenu;
  const shouldShowSubmenu = hoveredSection || (isPinned && activeSection);

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
            <SheetContent side="left" className="p-0 w-[80%]">
              <div className="flex flex-col h-full bg-sidebar">
                <div className="p-6 border-b border-sidebar-accent flex items-center justify-between">
                  <img src={logoUrl} alt="Logo" className="h-12" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <nav className="p-4 space-y-2">
                    {menuSections.map((section) => {
                      const isSectionActive = section.items.some((item) =>
                        isActive(item.to)
                      );

                      return (
                        <div key={section.title} className="space-y-1">
                          <div
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
                              isSectionActive
                                ? "bg-white text-sidebar-primary shadow-sm"
                                : "text-muted-foreground"
                            )}
                          >
                            <section.icon className="h-5 w-5" />
                            <span>{section.title}</span>
                          </div>
                          <div className="ml-4 space-y-1">
                            {section.items.map((item) => (
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
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </ScrollArea>
                <div className="p-4 border-t border-sidebar-accent space-y-2">
                  {role === "admin" && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => {
                        navigate("/settings");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Settings className="h-5 w-5" />
                      <span>Configurações</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <span className="ml-4 font-semibold text-lg">
            {settings?.company_name || "Curitiba Inox"}
          </span>
        </header>

        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden lg:flex fixed left-0 top-0 bottom-0 bg-sidebar transition-all duration-300 ease-in-out z-40",
            isMenuExpanded ? "w-60" : "w-18"
          )}
          onMouseEnter={() => setIsHoveringMenu(true)}
          onMouseLeave={() => {
            setIsHoveringMenu(false);
            handleMenuMouseLeave();
          }}
        >
          <div className="flex flex-col w-full h-full">
            {/* Logo */}
            <div className="flex items-center justify-center h-20 border-b border-sidebar-accent">
              <img
                src={logoUrl}
                alt="Logo"
                className={cn(
                  "transition-all duration-300",
                  isMenuExpanded ? "h-12" : "h-10"
                )}
              />
            </div>

            {/* Menu Principal */}
            <ScrollArea className="flex-1">
              <nav className="p-3 space-y-2" role="menu">
                {menuSections.map((section) => {
                  const isSectionActive = section.items.some((item) =>
                    isActive(item.to)
                  );

                  return (
                    <Tooltip key={section.title}>
                      <TooltipTrigger asChild>
                        <button
                          role="menuitem"
                          aria-haspopup="true"
                          aria-expanded={hoveredSection === section.title}
                          aria-label={section.title}
                          onMouseEnter={() => handleSectionMouseEnter(section.title)}
                          className={cn(
                            "flex items-center gap-3 w-full rounded-lg text-sm font-medium transition-all duration-200",
                            isMenuExpanded ? "px-4 py-3" : "px-0 py-3 justify-center",
                            isSectionActive
                              ? "bg-white text-sidebar-primary border-l-[3px] border-sidebar-primary shadow-sm"
                              : "text-[#64748B] hover:bg-[#ECEFF1] hover:text-sidebar-primary"
                          )}
                        >
                          <section.icon className="h-5 w-5 flex-shrink-0" />
                          {isMenuExpanded && <span>{section.title}</span>}
                        </button>
                      </TooltipTrigger>
                      {!isMenuExpanded && (
                        <TooltipContent side="right">
                          {section.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* Footer: Fixar Menu + Configurações + Sair */}
            <div className="p-3 border-t border-sidebar-accent space-y-2">
              {/* Toggle Fixar Menu */}
              <div className={cn(
                "flex items-center gap-2 px-2 py-2",
                isMenuExpanded ? "justify-start" : "justify-center"
              )}>
                <Switch
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                  id="pin-menu"
                  className="data-[state=checked]:bg-sidebar-primary"
                />
                {isMenuExpanded && (
                  <label
                    htmlFor="pin-menu"
                    className="text-xs text-[#64748B] cursor-pointer whitespace-nowrap"
                  >
                    Fixar menu
                  </label>
                )}
              </div>

              {role === "admin" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size={isMenuExpanded ? "default" : "icon"}
                      className={cn(
                        "w-full transition-all duration-200",
                        isMenuExpanded ? "justify-start gap-3" : "justify-center"
                      )}
                      onClick={() => navigate("/settings")}
                    >
                      <Settings className="h-5 w-5 flex-shrink-0" />
                      {isMenuExpanded && <span>Configurações</span>}
                    </Button>
                  </TooltipTrigger>
                  {!isMenuExpanded && (
                    <TooltipContent side="right">Configurações</TooltipContent>
                  )}
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={isMenuExpanded ? "default" : "icon"}
                    className={cn(
                      "w-full transition-all duration-200",
                      isMenuExpanded ? "justify-start gap-3" : "justify-center"
                    )}
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 flex-shrink-0" />
                    {isMenuExpanded && <span>Sair</span>}
                  </Button>
                </TooltipTrigger>
                {!isMenuExpanded && (
                  <TooltipContent side="right">Sair</TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Submenu Panel */}
        {shouldShowSubmenu && (
          <div
            className={cn(
              "hidden lg:block fixed top-0 bottom-0 bg-white border-r border-border submenu-panel submenu-shadow z-30",
              "w-70",
              isMenuExpanded ? "left-60" : "left-18"
            )}
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuMouseLeave}
          >
            <div className="flex flex-col h-full">
              {/* Header com título */}
              <div className="h-20 border-b border-border flex items-center px-6">
                <h2 className="text-base font-semibold text-[#152752] uppercase">
                  {hoveredSection || activeSection?.title}
                </h2>
              </div>

              {/* Lista de Subitens */}
              <ScrollArea className="flex-1">
                <nav className="p-4 space-y-1">
                  {menuSections
                    .find(
                      (section) =>
                        section.title === hoveredSection ||
                        section.title === activeSection?.title
                    )
                    ?.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
                          isActive(item.to)
                            ? "bg-[#F5F6F8] text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary"
                            : "text-[#434247] hover:bg-[#ECEFF1] hover:text-sidebar-primary"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                </nav>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 transition-all duration-300 pt-16 lg:pt-0",
            isMenuExpanded
              ? shouldShowSubmenu
                ? "lg:ml-[520px]"
                : "lg:ml-60"
              : shouldShowSubmenu
              ? "lg:ml-[352px]"
              : "lg:ml-18"
          )}
        >
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
