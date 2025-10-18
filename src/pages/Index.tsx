import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Sistema de OS - Assistência Técnica</h1>
        <p className="text-xl text-muted-foreground">
          Bem-vindo, {user?.email}
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={handleLogout} variant="outline">
            Sair
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-8">
          Sprint 0 concluído ✅
        </p>
      </div>
    </div>
  );
};

export default Index;
