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

      // Placeholder - the RPC function may not exist
      // Return empty array for now
      console.log('SLA performance query - RPC may not be configured');
      return [] as SlaPerformanceByUser[];
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
        .select("id, stage_entered_at, created_at")
        .eq("organization_id", profile.organization_id);

      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data: leads, error } = await query;

      if (error) throw error;

      // Basic summary without SLA fields that may not exist
      return {
        totalPending: leads?.length || 0,
        totalWarning: 0,
        totalOverdue: 0,
        avgResponseTime: null,
        slaComplianceRate: null,
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
