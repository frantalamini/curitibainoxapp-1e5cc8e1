import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/curitiba-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useNewServiceCallsCount } from "@/hooks/useNewServiceCallsCount";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Icon, Icons, type IconName } from "@/components/ui/icons";
import { NotificationBell } from "@/components/mobile/NotificationBell";
import { UserAvatar } from "@/components/UserAvatar";

interface MainLayoutProps {
  children: ReactNode;
}

interface MenuSection {
  title: string;
  icon: IconName;
  items: MenuItem[];
}

interface MenuItem {
  to: string;
  icon: IconName;
  label: string;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>("Cadastros");
  const { isAdmin } = useUserRole();
  const { settings } = useSystemSettings();
  const { data: newCallsCount = 0 } = useNewServiceCallsCount();
  const { data: userProfile } = useCurrentUserProfile();

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
      icon: "usuarios",
      items: [
        { icon: "clientesFornecedores", label: "Clientes e Fornecedores", to: "/cadastros/clientes" },
        { icon: "equipamentos", label: "Produtos", to: "/products" },
        { icon: "equipamentos", label: "Equipamentos (Ativos)", to: "/equipment" },
        { icon: "servicos", label: "Serviços", to: "/service-types" },
        { icon: "atividade", label: "Status de Chamado", to: "/service-call-statuses" },
        { icon: "financeiro", label: "Formas de Pagamento", to: "/payment-methods" },
        { icon: "veiculo", label: "Veículos", to: "/vehicles" },
        ...(isAdmin
          ? [
              { icon: "usuarios" as IconName, label: "Técnicos", to: "/technicians" },
              { icon: "seguranca" as IconName, label: "Gerenciar Usuários", to: "/admin/users" },
            ]
          : []),
        { icon: "checklist", label: "Checklists", to: "/checklists" },
      ],
    },
    {
      title: "Serviços",
      icon: "servicos",
      items: [
        { icon: "documentos", label: "Contratos", to: "/contracts" },
        { icon: "chamadosTecnicos", label: "Ordens de Serviço", to: "/service-calls" },
        { icon: "checklist", label: "Notas de Serviço", to: "/service-notes" },
        { icon: "relatorios", label: "Relatórios", to: "/service-reports" },
        { icon: "financeiro", label: "Reembolso Técnico", to: "/technician-reimbursements" },
      ],
    },
    {
      title: "Agenda",
      icon: "agenda",
      items: [
        { icon: "agenda", label: "Compromissos", to: "/schedule" },
        { icon: "servicos", label: "Técnicos em Campo", to: "/technicians" },
        { icon: "veiculo", label: "Mapa de Técnicos", to: "/technician-map" },
      ],
    },
    // Módulo Finanças - Admin Only (após Agenda)
    ...(isAdmin
      ? [
          {
            title: "Finanças",
            icon: "financeiro" as IconName,
            items: [
              { icon: "dashboard" as IconName, label: "Dashboard", to: "/financas/dashboard" },
              { icon: "documentos" as IconName, label: "Contas a Pagar", to: "/financas/contas-a-pagar" },
              { icon: "financeiro" as IconName, label: "Contas a Receber", to: "/financas/contas-a-receber" },
              { icon: "agenda" as IconName, label: "Cartões de Crédito", to: "/financas/cartoes" },
              { icon: "relatorios" as IconName, label: "Fluxo de Caixa", to: "/financas/fluxo-de-caixa" },
              { icon: "atividade" as IconName, label: "DRE", to: "/financas/dre" },
              { icon: "servicos" as IconName, label: "Rentabilidade OS", to: "/financas/rentabilidade-os" },
              { icon: "usuarios" as IconName, label: "Centro de Custo", to: "/financas/centro-de-custo" },
              { icon: "usuarios" as IconName, label: "Custos por Técnico", to: "/financas/custos-por-tecnico" },
              { icon: "veiculo" as IconName, label: "Custos por Veículo", to: "/financas/custos-por-veiculo" },
              { icon: "financeiro" as IconName, label: "Conciliação Bancária", to: "/financas/conciliacao-bancaria" },
              { icon: "agenda" as IconName, label: "Orçamento Mensal", to: "/financas/orcamento-mensal" },
              { icon: "relatorios" as IconName, label: "Despesas Recorrentes", to: "/financas/despesas-recorrentes" },
              { icon: "configuracoes" as IconName, label: "Configurações", to: "/financas/configuracoes" },
            ],
          },
        ]
      : []),
    {
      title: "Relatórios",
      icon: "relatorios",
      items: [
        { icon: "relatorios", label: "Dashboard", to: "/dashboard" },
        { icon: "atividade", label: "Indicadores Técnicos", to: "/technical-indicators" },
        { icon: "financeiro", label: "Financeiro", to: "/financial" },
        { icon: "servicos", label: "Manutenções de Veículos", to: "/vehicle-maintenances" },
        { icon: "veiculo", label: "Deslocamentos", to: "/service-call-trips" },
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
      <div className="min-h-screen-dvh lg:min-h-screen bg-background flex w-full mobile-layout lg:block">
        {/* Mobile Header with Safe Area */}
        <header className="lg:hidden mobile-header px-4">
          <div className="flex items-center justify-between h-16 w-full">
            <div className="flex items-center gap-2">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="touch-manipulation">
                    <Icon name="menu" size="lg" />
                  </Button>
                </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                {/* Mobile Sidebar Content */}
                <div className="flex h-full bg-sidebar">
                  {/* Main Menu Column */}
                  <div className="w-[90px] flex flex-col items-center py-6 bg-sidebar border-r border-sidebar-accent">
                    <img src={settings?.logo_url || logoUrl} alt="Logo" className="w-16 h-16 mb-6 object-contain" />
                    <nav className="flex flex-col gap-2.5 flex-1">
                      {menuSections.map((section) => (
                        <Tooltip key={section.title}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setActiveSection(section.title)}
                              className={cn(
                                "w-16 h-16 flex items-center justify-center rounded-lg transition-all duration-200 touch-manipulation",
                                activeSection === section.title
                                  ? "bg-white text-sidebar-primary shadow-sm"
                                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-primary"
                              )}
                            >
                              <Icon name={section.icon} size="lg" color="current" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">{section.title}</TooltipContent>
                        </Tooltip>
                      ))}
                    </nav>
                    
                    {/* Mobile Logout Button - Always visible at bottom */}
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-14 h-14 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-all touch-manipulation mt-auto"
                      title="Sair da conta"
                    >
                      <Icon name="sair" size="lg" color="current" />
                    </button>
                  </div>

                  {/* Submenu Column */}
                  <div className="flex-1 bg-white flex flex-col">
                    {/* Home Button - Always visible at top */}
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate("/inicio");
                      }}
                      className="m-4 mb-2 p-3 rounded-lg bg-primary/10 text-primary flex items-center gap-2 touch-manipulation hover:bg-primary/20 transition-colors"
                    >
                      <Icon name="home" size="sm" />
                      <span className="font-medium">Início</span>
                    </button>
                    
                    {activeMenuSection && (
                      <ScrollArea className="flex-1">
                        <div className="px-6 pb-6">
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
                                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors duration-200 touch-manipulation",
                                  isActive(item.to)
                                    ? "bg-[#F5F6F8] text-sidebar-primary font-medium border-l-[3px] border-sidebar-primary"
                                    : "text-[#434247] hover:bg-[#ECEFF1] hover:text-sidebar-primary"
                                )}
                              >
                                <Icon name={item.icon} size="sm" color="current" />
                                <span className="flex-1">{item.label}</span>
                                {item.to === "/service-calls" && newCallsCount > 0 && (
                                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                                    {newCallsCount}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </nav>
                        </div>
                      </ScrollArea>
                    )}
                    
                    {/* Logout Button with text - visible at bottom */}
                    <div className="p-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full p-3 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors touch-manipulation"
                      >
                        <Icon name="sair" size="sm" />
                        <span className="font-medium">Sair da conta</span>
                      </button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
              {/* Clickable logo/name to go Home */}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 touch-manipulation active:opacity-70 transition-opacity"
              >
                <img 
                  src={settings?.logo_url || logoUrl} 
                  alt="Logo" 
                  className="h-8 w-8 object-contain"
                />
                <span className="font-semibold text-lg truncate max-w-[150px]">
                  {settings?.company_name || "Curitiba Inox"}
                </span>
              </button>
            </div>
            {/* Home button + User Avatar + Notification Bell */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/inicio")}
                className="touch-manipulation"
                title="Voltar ao início"
              >
                <Icon name="home" size="md" />
              </Button>
              {userProfile && (
                <UserAvatar
                  initial={userProfile.initial}
                  name={userProfile.firstName}
                  size="sm"
                  showTooltip={false}
                />
              )}
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Desktop Sidebar - Two Column Layout */}
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30">
          {/* Column 1: Main Menu (90px) */}
          <div className="w-[90px] flex flex-col items-center py-6 bg-sidebar border-r border-sidebar-accent">
            {/* Logo */}
            <img src={settings?.logo_url || logoUrl} alt="Logo" className="w-16 h-16 mb-6 object-contain" />

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
                      <Icon name={section.icon} size="lg" color="current" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{section.title}</TooltipContent>
                </Tooltip>
              ))}
            </nav>

            {/* Footer: User Avatar, Settings and Logout */}
            <div className="mt-auto space-y-2 flex flex-col items-center">
              {/* User Avatar */}
              {userProfile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <UserAvatar
                        initial={userProfile.initial}
                        name={userProfile.firstName}
                        size="md"
                        showTooltip={false}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{userProfile.firstName}</TooltipContent>
                </Tooltip>
              )}

              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate("/settings")}
                      className="h-12 w-12"
                    >
                      <Icon name="configuracoes" size="md" />
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
                    <Icon name="sair" size="md" />
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
                          <Icon name={item.icon} size="sm" color="current" />
                          <span className="flex-1">{item.label}</span>
                          {item.to === "/service-calls" && newCallsCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                              {newCallsCount}
                            </span>
                          )}
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
            "flex-1 min-w-0 transition-all duration-[250ms]",
            // Mobile: use mobile-main class for safe areas
            "mobile-main lg:mt-0 lg:pb-0 lg:pl-0 lg:pr-0",
            // Desktop: only margin, flex-1 handles remaining width
            activeSection 
              ? "lg:ml-[346px]" 
              : "lg:ml-[90px]"
          )}
        >
          <div className="w-full max-w-full min-w-0 lg:p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
