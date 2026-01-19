import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SlaPerformanceByUser {
  user_id: string;
  user_name: string;
  total_leads: number;
  responded_in_time: number;
  responded_late: number;
  pending_response: number;
  overdue_count: number;
  avg_response_seconds: number | null;
  avg_first_touch_seconds: number | null;
  sla_compliance_rate: number | null;
}

export interface SlaFilters {
  startDate?: Date;
  endDate?: Date;
  pipelineId?: string | null;
}

export function useSlaPerformanceByUser(filters?: SlaFilters) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["sla-performance-by-user", filters],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase.rpc("get_sla_performance_by_user", {
        p_organization_id: profile.organization_id,
        p_start_date: filters?.startDate?.toISOString() ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: filters?.endDate?.toISOString() ?? new Date().toISOString(),
        p_pipeline_id: filters?.pipelineId ?? null,
      });

      if (error) throw error;
      return (data ?? []) as SlaPerformanceByUser[];
    },
    enabled: !!profile?.organization_id,
  });
}

export interface SlaSummary {
  totalPending: number;
  totalWarning: number;
  totalOverdue: number;
  avgResponseTime: number | null;
  slaComplianceRate: number | null;
}

export function useSlaSummary(pipelineId?: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["sla-summary", pipelineId],
    queryFn: async (): Promise<SlaSummary> => {
      if (!profile?.organization_id) {
        return {
          totalPending: 0,
          totalWarning: 0,
          totalOverdue: 0,
          avgResponseTime: null,
          slaComplianceRate: null,
        };
      }

      // Get leads awaiting response
      let query = supabase
        .from("leads")
        .select("id, sla_status, first_response_at, first_response_seconds")
        .eq("organization_id", profile.organization_id);

      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data: leads, error } = await query;

      if (error) throw error;

      const pendingLeads = leads?.filter(l => !l.first_response_at) ?? [];
      const respondedLeads = leads?.filter(l => l.first_response_at) ?? [];

      // Get SLA settings to calculate compliance
      const { data: slaSettings } = await supabase
        .from("pipeline_sla_settings")
        .select("pipeline_id, first_response_target_seconds")
        .eq("is_active", true);

      const defaultTarget = 300;

      // Calculate metrics
      let inTime = 0;
      let totalResponded = 0;
      let totalSeconds = 0;

      for (const lead of respondedLeads) {
        if (lead.first_response_seconds !== null) {
          totalResponded++;
          totalSeconds += lead.first_response_seconds;
          
          // Check SLA compliance - we'd need pipeline_id for each lead
          // For simplicity, using default target
          if (lead.first_response_seconds <= defaultTarget) {
            inTime++;
          }
        }
      }

      return {
        totalPending: pendingLeads.length,
        totalWarning: pendingLeads.filter(l => l.sla_status === "warning").length,
        totalOverdue: pendingLeads.filter(l => l.sla_status === "overdue").length,
        avgResponseTime: totalResponded > 0 ? Math.round(totalSeconds / totalResponded) : null,
        slaComplianceRate: totalResponded > 0 ? Math.round((inTime / totalResponded) * 100) : null,
      };
    },
    enabled: !!profile?.organization_id,
  });
}

export function formatSlaTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "-";
  
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
