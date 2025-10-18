import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Home,
  Users,
  Smartphone,
  Wrench,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

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

  const menuItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/clients", icon: Users, label: "Clientes" },
    { to: "/equipment", icon: Smartphone, label: "Equipamentos" },
    ...(isAdmin ? [{ to: "/technicians", icon: Wrench, label: "Técnicos" }] : []),
    { to: "/service-calls", icon: ClipboardList, label: "Chamados" },
    { to: "/schedule", icon: Calendar, label: "Agenda" },
  ];

  const NavItems = () => (
    <>
      {menuItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
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
          <div className="flex items-center justify-center h-16 border-b px-4">
            <h1 className="text-xl font-bold">Sistema OS</h1>
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
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center h-16 border-b">
                <h1 className="text-xl font-bold">Sistema OS</h1>
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
        <h1 className="ml-4 text-xl font-bold">Sistema OS</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
