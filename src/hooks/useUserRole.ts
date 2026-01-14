import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRoles([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching roles:", error);
          setRoles([]);
        } else {
          const fetchedRoles = data?.map((r) => r.role) || [];
          console.log("🔐 useUserRole - User ID:", user.id);
          console.log("🔐 useUserRole - Roles fetched:", fetchedRoles);
          console.log("🔐 useUserRole - isAdmin:", fetchedRoles.includes("admin"));
          setRoles(fetchedRoles);
        }
      } catch (error) {
        console.error("Error in fetchRoles:", error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return {
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isTechnician: roles.includes("technician"),
    isUser: roles.includes("user"),
  };
};
