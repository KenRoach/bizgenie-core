import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  settings: unknown;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
}

interface BusinessContextType {
  business: Business | null;
  loading: boolean;
  updateBusiness: (updates: Partial<Business>) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType>({
  business: null,
  loading: true,
  updateBusiness: async () => {},
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setBusiness(data as Business);
      }
      setLoading(false);
    };

    fetchBusiness();
  }, [user]);

  const updateBusiness = async (updates: { name?: string; slug?: string }) => {
    if (!business) return;
    const { data, error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", business.id)
      .select()
      .maybeSingle();

    if (!error && data) {
      setBusiness(data as Business);
    }
  };

  return (
    <BusinessContext.Provider value={{ business, loading, updateBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
