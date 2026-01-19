import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string | null;
  user_id: string | null;
  organization_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user?: { name: string; email: string } | null;
  organization?: { name: string } | null;
}

export interface AuditLogFilters {
  organizationId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export function useAuditLogs(filters: AuditLogFilters, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["audit-logs", filters, page, limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select(`
          *,
          user:user_id (name, email),
          organization:organization_id (name)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (filters.organizationId) {
        query = query.eq("organization_id", filters.organizationId);
      }

      if (filters.action) {
        query = query.eq("action", filters.action);
      }

      if (filters.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }

      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data as AuditLog[],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
  });
}

export function useAuditLogActions() {
  return useQuery({
    queryKey: ["audit-log-actions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("action")
        .limit(100);

      if (error) throw error;

      const uniqueActions = [...new Set(data.map((d) => d.action))];
      return uniqueActions.sort();
    },
  });
}

export function useAuditLogEntityTypes() {
  return useQuery({
    queryKey: ["audit-log-entity-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("entity_type")
        .not("entity_type", "is", null)
        .limit(100);

      if (error) throw error;

      const uniqueTypes = [...new Set(data.map((d) => d.entity_type).filter(Boolean))];
      return uniqueTypes.sort() as string[];
    },
  });
}
