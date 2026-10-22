import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess, type MyAccess } from "@/lib/access.functions";

/** Current user's role/centers; null when signed out. Client-only (session lives in the browser). */
export function useAccess() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const query = useQuery({
    queryKey: ["me"],
    enabled: hydrated,
    queryFn: async (): Promise<MyAccess | null> => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      return getMyAccess();
    },
  });
  return { ...query, data: hydrated ? query.data : undefined, isLoading: !hydrated || query.isLoading };
}
