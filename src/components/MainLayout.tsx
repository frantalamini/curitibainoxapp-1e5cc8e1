import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import logo from "@/assets/logo.png";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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

  const NavItems = () => (
    <>
      {menuSections.map((section) => (
        <div key={section.title} className="mb-6">
          <h3 className="text-xs font-bold text-muted-foreground mb-2 px-4 uppercase tracking-wider">
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "hover:bg-primary/10 text-foreground"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </>
  );

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
