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
  const { role } = useUserRole();
  const { settings } = useSystemSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState<string | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [pinnedSection, setPinnedSection] = useState<string | null>(null);
  const [isHoveringSubmenu, setIsHoveringSubmenu] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (pinnedSection || isOverlayOpen)) {
        setPinnedSection(null);
        setHoveredSection(null);
        setIsOverlayOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [pinnedSection, isOverlayOpen]);

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

  const handleRailMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringSubmenu && !pinnedSection) {
        setIsOverlayOpen(false);
        setHoveredSection(null);
      }
    }, 200);
  };

  const handleOverlayMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHoveringSubmenu(true);
  };

  const handleOverlayMouseLeave = () => {
    setIsHoveringSubmenu(false);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!pinnedSection) {
        setIsOverlayOpen(false);
        setHoveredSection(null);
      }
    }, 200);
  };

  const handleSectionClick = (sectionTitle: string) => {
    if (pinnedSection === sectionTitle) {
      setPinnedSection(null);
      setIsOverlayOpen(false);
      setHoveredSection(null);
    } else {
      setPinnedSection(sectionTitle);
      setIsOverlayOpen(true);
    }
  };

  const activeOverlaySection = pinnedSection || hoveredSection;
  const shouldShowOverlay = isOverlayOpen && activeOverlaySection !== null;

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
                          <button
                            onClick={() => setMobileActiveSection(section.title)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full",
                              isSectionActive
                                ? "bg-white text-sidebar-primary shadow-sm"
                                : "text-muted-foreground"
                            )}
                          >
                            <section.icon className="h-5 w-5" />
                            <span>{section.title}</span>
                          </button>
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

        {/* Desktop Rail - Fixed 72px */}
        <aside
          className="hidden lg:flex fixed left-0 top-0 bottom-0 w-18 bg-sidebar z-50"
          onMouseEnter={() => setIsOverlayOpen(true)}
          onMouseLeave={handleRailMouseLeave}
        >
          <div className="flex flex-col w-full h-full">
            {/* Logo */}
            <div className="flex items-center justify-center h-20 border-b border-sidebar-accent">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-10 w-10 object-contain"
              />
            </div>

            {/* Menu Items */}
            <ScrollArea className="flex-1">
              <nav className="p-3 space-y-2" role="menu">
                {menuSections.map((section) => {
                  const isSectionActive = section.items.some(item => isActive(item.to));
                  
                  return (
                    <Tooltip key={section.title}>
                      <TooltipTrigger asChild>
                        <button
                          role="menuitem"
                          aria-haspopup="true"
                          aria-expanded={activeOverlaySection === section.title}
                          aria-label={section.title}
                          onMouseEnter={() => setHoveredSection(section.title)}
                          onClick={() => handleSectionClick(section.title)}
                          className={cn(
                            "flex items-center justify-center w-full h-14 rounded-lg",
                            "transition-colors duration-200",
                            isSectionActive || pinnedSection === section.title
                              ? "bg-white text-sidebar-primary shadow-sm"
                              : "text-[#64748B] hover:bg-[#ECEFF1] hover:text-sidebar-primary"
                          )}
                        >
                          <section.icon className="h-6 w-6" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{section.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-sidebar-accent space-y-2">
              {role === "admin" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-full h-14"
                      onClick={() => navigate("/settings")}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Configurações</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-14"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sair</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Backdrop - apenas quando pinnedSection está ativo */}
        {pinnedSection && (
          <div
            className="hidden lg:block fixed inset-0 z-55"
            onClick={() => {
              setPinnedSection(null);
              setHoveredSection(null);
              setIsOverlayOpen(false);
            }}
          />
        )}

        {/* Desktop Overlay - Independent */}
        {shouldShowOverlay && (
          <div
            className="hidden lg:block fixed top-0 left-18 h-screen w-75 bg-white z-60 border-r border-border overlay-shadow animate-slide-in-right"
            onMouseEnter={handleOverlayMouseEnter}
            onMouseLeave={handleOverlayMouseLeave}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="h-20 border-b border-border flex items-center justify-between px-6">
                <h2 className="text-base font-semibold text-[#152752] uppercase">
                  {activeOverlaySection}
                </h2>
                
                {/* Botão X - apenas quando pinnedSection está ativo */}
                {pinnedSection && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPinnedSection(null);
                      setHoveredSection(null);
                      setIsOverlayOpen(false);
                    }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Lista de Subitens */}
              <ScrollArea className="flex-1">
                <nav className="p-4 space-y-1">
                  {menuSections
                    .find(section => section.title === activeOverlaySection)
                    ?.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm",
                          "transition-colors duration-200",
                          isActive(item.to)
                            ? "bg-[#F5F6F8] text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary"
                            : "text-[#434247] hover:bg-[#F5F6F8] hover:text-sidebar-primary"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                </nav>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Mobile Submenu Overlay */}
        {mobileActiveSection && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 bg-black/60 z-60"
              onClick={() => setMobileActiveSection(null)}
            />
            
            {/* Overlay */}
            <div className="lg:hidden fixed right-0 top-0 bottom-0 w-[80%] bg-white z-70 shadow-2xl animate-slide-in-right">
              <div className="flex flex-col h-full">
                {/* Header com X */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6">
                  <h2 className="text-base font-semibold text-[#152752] uppercase">
                    {mobileActiveSection}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileActiveSection(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Lista de subitens */}
                <ScrollArea className="flex-1">
                  <nav className="p-4 space-y-1">
                    {menuSections
                      .find(section => section.title === mobileActiveSection)
                      ?.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileActiveSection(null)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm",
                            isActive(item.to)
                              ? "bg-[#F5F6F8] text-sidebar-primary font-medium"
                              : "text-[#434247] hover:bg-[#F5F6F8]"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                  </nav>
                </ScrollArea>
              </div>
            </div>
          </>
        )}

        {/* Main Content - Fixed margin */}
        <main className="flex-1 pt-16 lg:pt-0 lg:ml-18">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
