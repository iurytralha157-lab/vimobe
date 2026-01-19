import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ContactListFilters {
  search?: string;
  pipelineId?: string;
  stageId?: string;
  userId?: string;
  tagId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  stage_id: string | null;
  pipeline_id: string | null;
  assigned_user_id: string | null;
  created_at: string;
  updated_at: string;
  stage?: {
    id: string;
    name: string;
    color: string | null;
  };
  assigned_user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export interface ContactsListResult {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useContactsList(filters: ContactListFilters = {}) {
  const { organization } = useAuth();
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  return useQuery({
    queryKey: ["contacts-list", organization?.id, filters],
    queryFn: async (): Promise<ContactsListResult> => {
      if (!organization?.id) {
        return { contacts: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      }

      let query = supabase
        .from("leads")
        .select(`
          *,
          stage:stages(id, name, color),
          assigned_user:users!leads_assigned_user_id_fkey(id, name, avatar_url),
          lead_tags(tag:tags(id, name, color))
        `, { count: 'exact' })
        .eq("organization_id", organization.id);

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      if (filters.pipelineId && filters.pipelineId !== 'all') {
        query = query.eq("pipeline_id", filters.pipelineId);
      }

      if (filters.stageId && filters.stageId !== 'all') {
        query = query.eq("stage_id", filters.stageId);
      }

      if (filters.userId && filters.userId !== 'all') {
        query = query.eq("assigned_user_id", filters.userId);
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo.toISOString());
      }

      // Sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const contacts: Contact[] = (data || []).map((lead: any) => ({
        ...lead,
        tags: lead.lead_tags?.map((lt: any) => lt.tag).filter(Boolean) || [],
      }));

      return {
        contacts,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!organization?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
}
