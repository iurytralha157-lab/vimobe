import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type KPIData = {
  ebitda: number;
  revenue: number;
  expense: number;
  roi_overview: number;
  total_active_projects: number;
  avg_progress: number;
  pending_requests: number;
};

export function useEnterpriseKPIs() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["enterprise-kpis", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      // Buscar KPIs do cache
      const { data: cacheData, error: cacheError } = await supabase
        .from("organization_kpi_cache" as any)
        .select("*")
        .eq("organization_id", organization.id);

      if (cacheError) throw cacheError;

      // Transformar array de cache em objeto de KPIs
      const kpis: any = {};
      cacheData?.forEach((item: any) => {
        kpis[item.kpi_key] = item.kpi_value;
      });

      // Fallback: Se o cache estiver vazio, tentar calcular em tempo real ou retornar padrão
      // Em uma implementação real, os triggers manteriam o cache atualizado
      
      return {
        financial: kpis.financial_overview || { ebitda: 0, revenue: 0, expense: 0, roi_overview: 0 },
        engineering: kpis.engineering_overview || { total_active: 0, avg_progress: 0, projects: [] },
      };
    },
    enabled: !!organization?.id,
  });
}

export function useConstructionTimeline(projectId: string) {
  return useQuery({
    queryKey: ["construction-timeline", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useConstructionPurchases(projectId: string) {
  return useQuery({
    queryKey: ["construction-purchases", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_purchase_orders")
        .select(`
          *,
          supplier:construction_suppliers(id, name)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
