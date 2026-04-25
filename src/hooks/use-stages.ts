import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { normalizePhone } from '@/lib/phone-utils';

export type Stage = Tables<'stages'> & {
  lead_count?: number;
};

interface FilteredStageCountsParams {
  pipelineId?: string;
  stageIds: string[];
  filterUser?: string;
  filterTag?: string;
  filterDealStatus?: string;
  searchQuery?: string;
  dateRange?: { from: Date; to: Date } | null;
  filterCampaign?: string;
  filterAdSet?: string;
  filterAd?: string;
}

// Limite de leads por estágio para paginação
const LEADS_PER_STAGE = 100;

// Campos otimizados para leads no pipeline - only columns that exist in the database
const LEAD_PIPELINE_FIELDS = `
  id, name, phone, email, source, created_at, 
  stage_id, assigned_user_id, pipeline_id, message,
  stage_entered_at, organization_id,
  deal_status, valor_interesse, property_id, lost_reason, won_at, lost_at,
  interest_property_id, interest_plan_id,
  first_response_at, first_response_seconds, first_response_is_automation,
  assignee:users!leads_assigned_user_id_fkey(id, name, avatar_url),
  interest_property:properties!leads_interest_property_id_fkey(id, code, title, preco),
  interest_plan:service_plans!leads_interest_plan_id_fkey(id, code, name, price),
  lead_meta(campaign_name, adset_name, ad_name, platform)
`;

export function useStages(pipelineId?: string) {
  return useQuery({
    queryKey: ['stages', pipelineId],
    queryFn: async () => {
      let query = supabase
        .from('stages')
        .select('id, name, color, stage_key, position, pipeline_id')
        .order('position');
      
      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const stages = data || [];
      
      // Count leads per stage using head:true (no data transfer, just count)
      const countPromises = stages.map(stage =>
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('stage_id', stage.id)
      );
      
      const countResults = await Promise.all(countPromises);
      
      return stages.map((stage, index) => ({
        ...stage,
        lead_count: countResults[index]?.count || 0,
      })) as Stage[];
    },
  });
}

export function useStagesWithLeads(
  pipelineId?: string, 
  filterUserId?: string,
  filters?: {
    dateRange?: { from: Date; to: Date } | null;
    filterTag?: string;
    filterDealStatus?: string;
    searchQuery?: string;
    filterCampaign?: string;
    filterAdSet?: string;
    filterAd?: string;
  }
) {
  const dateFromISO = filters?.dateRange?.from?.toISOString();
  const dateToISO = filters?.dateRange?.to?.toISOString();
  
  return useQuery({
    queryKey: ['stages-with-leads', pipelineId, filterUserId, dateFromISO, dateToISO, filters?.filterTag, filters?.filterDealStatus, filters?.searchQuery, filters?.filterCampaign, filters?.filterAdSet, filters?.filterAd],
    queryFn: async () => {
      // Get default pipeline if not provided
      let targetPipelineId = pipelineId;
      if (!targetPipelineId) {
        const { data: pipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('is_default', true)
          .maybeSingle();
        
        targetPipelineId = pipeline?.id;
      }
      
      if (!targetPipelineId) {
        return [];
      }
      
      // Primeiro buscar stages para saber quantos temos
      const stagesResult = await supabase
        .from('stages')
        .select('id, name, color, stage_key, position, pipeline_id')
        .eq('pipeline_id', targetPipelineId)
        .order('position');
      
      if (stagesResult.error) throw stagesResult.error;
      const stages = stagesResult.data || [];

      // Pre-fetch tagged lead IDs if tag filter is active
      let taggedLeadIds: string[] | null = null;
      if (filters?.filterTag && filters.filterTag !== 'all') {
        const { data: taggedLeads } = await supabase
          .from('lead_tags')
          .select('lead_id')
          .eq('tag_id', filters.filterTag);
        taggedLeadIds = [...new Set((taggedLeads || []).map(item => item.lead_id).filter(Boolean))];
        if (taggedLeadIds.length === 0) {
          // No leads match this tag, return empty stages
          return stages.map(stage => ({
            ...stage,
            leads: [],
            total_lead_count: 0,
            has_more: false,
          }));
        }
      }

      const normalizedSearch = filters?.searchQuery?.trim();

      // Helper to apply shared filters to a query
      const applyFilters = (query: any) => {
        if (filterUserId && filterUserId !== 'all') {
          query = query.eq('assigned_user_id', filterUserId);
        }
        if (filters?.filterDealStatus && filters.filterDealStatus !== 'all') {
          query = query.eq('deal_status', filters.filterDealStatus);
        }
        if (normalizedSearch) {
          query = query.or(`name.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%`);
        }
        // Apply date filter only when not searching
        if (!normalizedSearch && filters?.dateRange) {
          query = query
            .gte('created_at', filters.dateRange.from.toISOString())
            .lte('created_at', filters.dateRange.to.toISOString());
        }
        if (taggedLeadIds) {
          query = query.in('id', taggedLeadIds);
        }
        if (filters?.filterCampaign && filters.filterCampaign !== 'all') {
          query = query.eq('lead_meta.campaign_name', filters.filterCampaign);
        }
        if (filters?.filterAdSet && filters.filterAdSet !== 'all') {
          query = query.eq('lead_meta.adset_name', filters.filterAdSet);
        }
        if (filters?.filterAd && filters.filterAd !== 'all') {
          query = query.eq('lead_meta.ad_name', filters.filterAd);
        }
        return query;
      };
      
      // Buscar leads paginados por estágio E contagens em paralelo
      const stageLeadsPromises = stages.map(stage => {
        let query = (supabase as any)
          .from('leads')
          .select(LEAD_PIPELINE_FIELDS)
          .eq('pipeline_id', targetPipelineId)
          .eq('stage_id', stage.id)
          .order('stage_entered_at', { ascending: false })
          .range(0, LEADS_PER_STAGE - 1);
        
        return applyFilters(query);
      });
      
      // Contagem total por estágio usando head:true (sem transferência de dados)
      const stageCountPromises = stages.map(stage => {
        let query = supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('pipeline_id', targetPipelineId)
          .eq('stage_id', stage.id);
        
        return applyFilters(query);
      });
      
      // Execute leads + counts in parallel
      const [stageLeadsResults, stageCountResults] = await Promise.all([
        Promise.all(stageLeadsPromises),
        Promise.all(stageCountPromises),
      ]);
      
      // Build total counts map
      const totalCountsByStage: Record<string, number> = {};
      stages.forEach((stage, index) => {
        totalCountsByStage[stage.id] = stageCountResults[index]?.count || 0;
      });
      
      // Combinar leads de todos os estágios em um array plano
      const leads: any[] = [];
      const leadsByStageRaw: Record<string, any[]> = {};
      
      stages.forEach((stage, index) => {
        const stageLeads = stageLeadsResults[index]?.data || [];
        leadsByStageRaw[stage.id] = stageLeads;
        leads.push(...stageLeads);
      });
      
      const leadIds = leads.map((l: any) => l.id);
      
      // Run ALL enrichment queries in parallel (tags, whatsapp, tasks)
      const [tagsByLead, phoneToWhatsApp, tasksByLead] = await Promise.all([
        // Tags
        (async () => {
          if (leadIds.length === 0) return {} as Record<string, { id: string; name: string; color: string }[]>;
          const { data: leadTags } = await supabase
            .from('lead_tags')
            .select('lead_id, tag:tags(id, name, color)')
            .in('lead_id', leadIds);
          return (leadTags || []).reduce((acc, lt) => {
            if (!acc[lt.lead_id]) acc[lt.lead_id] = [];
            if (lt.tag) acc[lt.lead_id].push(lt.tag as any);
            return acc;
          }, {} as Record<string, { id: string; name: string; color: string }[]>);
        })(),
        // WhatsApp conversations
        (async () => {
          const leadsWithPhone = leads.filter((l: any) => l.phone);
          const result = new Map<string, { picture: string | null; unread_count: number; has_messages: boolean }>();
          if (leadsWithPhone.length === 0) return result;
          
          const phoneNumbers: string[] = [];
          leadsWithPhone.forEach((l: any) => {
            const cleaned = l.phone.replace(/\D/g, '');
            if (!cleaned) return;
            phoneNumbers.push(cleaned);
            if (cleaned.startsWith('55') && cleaned.length >= 12) {
              phoneNumbers.push(cleaned.substring(2));
            } else {
              phoneNumbers.push('55' + cleaned);
            }
          });
          const uniquePhones = [...new Set(phoneNumbers.filter(Boolean))];
          
          if (uniquePhones.length === 0) return result;
          
          const { data: conversations } = await supabase
            .from('whatsapp_conversations')
            .select('contact_phone, contact_picture, unread_count, last_message_at')
            .in('contact_phone', uniquePhones)
            .is('deleted_at', null);
          
          (conversations || []).forEach(c => {
            if (c.contact_phone) {
              const normalized = normalizePhone(c.contact_phone);
              if (normalized) {
                const existing = result.get(normalized);
                result.set(normalized, {
                  picture: c.contact_picture || existing?.picture || null,
                  unread_count: (existing?.unread_count || 0) + (c.unread_count || 0),
                  has_messages: existing?.has_messages || !!c.last_message_at,
                });
              }
            }
          });
          return result;
        })(),
        // Tasks
        (async () => {
          const result: Record<string, { pending: number; completed: number }> = {};
          if (leadIds.length === 0) return result;
          const { data: taskCounts } = await supabase
            .from('lead_tasks')
            .select('lead_id, is_done')
            .in('lead_id', leadIds);
          (taskCounts || []).forEach((t: any) => {
            if (!result[t.lead_id]) result[t.lead_id] = { pending: 0, completed: 0 };
            if (t.is_done) {
              result[t.lead_id].completed++;
            } else {
              result[t.lead_id].pending++;
            }
          });
          return result;
        })(),
      ]);
      
      // Map de stages para lookup rápido
      const stagesById = stages.reduce((acc, stage) => {
        acc[stage.id] = stage;
        return acc;
      }, {} as Record<string, any>);
      
      // Enriquecer leads por estágio
      const enrichedLeadsByStage: Record<string, any[]> = {};
      
      for (const stageId of Object.keys(leadsByStageRaw)) {
        enrichedLeadsByStage[stageId] = leadsByStageRaw[stageId].map((lead: any) => {
          let whatsapp_picture: string | null = null;
          let unread_count = 0;
          let has_whatsapp_messages = false;
          if (lead.phone) {
            const normalizedPhone = normalizePhone(lead.phone);
            const whatsappData = phoneToWhatsApp.get(normalizedPhone);
            whatsapp_picture = whatsappData?.picture || null;
            unread_count = whatsappData?.unread_count || 0;
            has_whatsapp_messages = whatsappData?.has_messages || false;
          }
          
          return {
            ...lead,
            tags: tagsByLead[lead.id] || [],
            tasks_count: tasksByLead[lead.id] || { pending: 0, completed: 0 },
            stage: stagesById[stageId] || null,
            whatsapp_picture,
            unread_count,
            has_whatsapp_messages,
          };
        });
      }
      
      return stages.map(stage => ({
        ...stage,
        leads: enrichedLeadsByStage[stage.id] || [],
        total_lead_count: totalCountsByStage[stage.id] || 0,
        has_more: (totalCountsByStage[stage.id] || 0) > LEADS_PER_STAGE,
      }));
    },
  });
}

export function useLeadMetaFilters() {
  return useQuery({
    queryKey: ['lead-meta-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_meta')
        .select('campaign_name, adset_name, ad_name')
        .not('campaign_name', 'is', null);
      
      if (error) throw error;
      
      const campaigns = [...new Set(data.map(item => item.campaign_name).filter(Boolean))].sort();
      const adsets = [...new Set(data.map(item => item.adset_name).filter(Boolean))].sort();
      const ads = [...new Set(data.map(item => item.ad_name).filter(Boolean))].sort();
      
      return { campaigns, adsets, ads };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useFilteredStageCounts({
  pipelineId,
  stageIds,
  filterUser,
  filterTag,
  filterDealStatus,
  searchQuery,
  dateRange,
  filterCampaign,
  filterAdSet,
  filterAd,
}: FilteredStageCountsParams) {
  return useQuery({
    queryKey: [
      'filtered-stage-counts',
      pipelineId,
      stageIds,
      filterUser,
      filterTag,
      filterDealStatus,
      searchQuery,
      dateRange?.from.toISOString(),
      dateRange?.to.toISOString(),
      filterCampaign,
      filterAdSet,
      filterAd,
    ],
    enabled: !!pipelineId && stageIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      if (!pipelineId || stageIds.length === 0) return {} as Record<string, number>;

      let taggedLeadIds: string[] | null = null;

      if (filterTag && filterTag !== 'all') {
        const { data: taggedLeads, error: taggedLeadsError } = await supabase
          .from('lead_tags')
          .select('lead_id')
          .eq('tag_id', filterTag);

        if (taggedLeadsError) throw taggedLeadsError;

        taggedLeadIds = [...new Set((taggedLeads || []).map((item) => item.lead_id).filter(Boolean))];

        if (taggedLeadIds.length === 0) {
          return Object.fromEntries(stageIds.map((stageId) => [stageId, 0]));
        }
      }

      const normalizedSearch = searchQuery?.trim();

      const counts = await Promise.all(
        stageIds.map(async (stageId) => {
          let query: any = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('pipeline_id', pipelineId)
            .eq('stage_id', stageId);

          if (filterUser && filterUser !== 'all') {
            query = query.eq('assigned_user_id', filterUser);
          }

          if (filterDealStatus && filterDealStatus !== 'all') {
            query = query.eq('deal_status', filterDealStatus);
          }

          if (normalizedSearch) {
            query = query.or(`name.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%`);
          }

          // Skip date filter when user is actively searching
          if (dateRange && !normalizedSearch) {
            query = query
              .gte('created_at', dateRange.from.toISOString())
              .lte('created_at', dateRange.to.toISOString());
          }

          if (taggedLeadIds) {
            query = query.in('id', taggedLeadIds);
          }

          if (filterCampaign && filterCampaign !== 'all') {
            query = query.eq('lead_meta.campaign_name', filterCampaign);
          }

          if (filterAdSet && filterAdSet !== 'all') {
            query = query.eq('lead_meta.adset_name', filterAdSet);
          }

          if (filterAd && filterAd !== 'all') {
            query = query.eq('lead_meta.ad_name', filterAd);
          }

          const { count, error } = await query;

          if (error) throw error;

          return [stageId, count || 0] as const;
        })
      );

      return Object.fromEntries(counts);
    },
  });
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name, is_default, created_at, organization_id')
        .order('created_at');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, isDefault = false }: { name: string; isDefault?: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');
      
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.user.id)
        .single();
      
      if (!userData?.organization_id) throw new Error('Organização não encontrada');
      
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          name,
          organization_id: userData.organization_id,
          is_default: isDefault,
        })
        .select()
        .single();
      
      if (pipelineError) throw pipelineError;
      
      // Usar função do banco para criar stages e cadências padrão
      const { error: stagesError } = await (supabase as any).rpc('create_default_stages_for_pipeline', {
        p_pipeline_id: pipeline.id,
        p_org_id: userData.organization_id,
      });
      
      if (stagesError) {
        console.warn('Could not create default stages:', stagesError);
      }
      
      return pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      queryClient.invalidateQueries({ queryKey: ['cadence-templates'] });
    },
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, isDefault }: { id: string; name?: string; isDefault?: boolean }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (isDefault !== undefined) updates.is_default = isDefault;
      
      const { data, error } = await supabase
        .from('pipelines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Check if any stages have leads before deleting
      const { data: stageIds } = await supabase
        .from('stages')
        .select('id')
        .eq('pipeline_id', id);
      
      if (stageIds && stageIds.length > 0) {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .in('stage_id', stageIds.map(s => s.id));
        
        if (count && count > 0) {
          throw new Error(`Esta pipeline possui ${count} lead(s). Mova ou exclua os leads antes de deletar a pipeline.`);
        }
      }
      
      // CASCADE will handle deleting stages automatically
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
    },
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ pipelineId, name, color }: { pipelineId: string; name: string; color?: string }) => {
      const { data: existingStages } = await supabase
        .from('stages')
        .select('position')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = (existingStages?.[0]?.position ?? -1) + 1;
      const stageKey = name.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      const { data, error } = await supabase
        .from('stages')
        .insert({
          pipeline_id: pipelineId,
          name,
          stage_key: stageKey,
          position: nextPosition,
          color: color || '#6b7280',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
    },
  });
}

// Hook para carregar mais leads de um estágio específico
export function useLoadMoreLeads() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      pipelineId, 
      stageId, 
      offset,
      filterUserId,
      filters,
    }: { 
      pipelineId: string; 
      stageId: string; 
      offset: number;
      filterUserId?: string;
      filters?: {
        dateRange?: { from: Date; to: Date } | null;
        filterTag?: string;
        filterDealStatus?: string;
        searchQuery?: string;
        filterCampaign?: string;
        filterAdSet?: string;
        filterAd?: string;
      };
    }) => {
      // Pre-fetch tagged lead IDs if tag filter is active
      let taggedLeadIds: string[] | null = null;
      if (filters?.filterTag && filters.filterTag !== 'all') {
        const { data: taggedLeads } = await supabase
          .from('lead_tags')
          .select('lead_id')
          .eq('tag_id', filters.filterTag);
        taggedLeadIds = [...new Set((taggedLeads || []).map(item => item.lead_id).filter(Boolean))];
      }

      const normalizedSearch = filters?.searchQuery?.trim();

      let query = (supabase as any)
        .from('leads')
        .select(LEAD_PIPELINE_FIELDS)
        .eq('pipeline_id', pipelineId)
        .eq('stage_id', stageId)
        .order('stage_entered_at', { ascending: false })
        .range(offset, offset + LEADS_PER_STAGE - 1);
      
      if (filterUserId && filterUserId !== 'all') {
        query = query.eq('assigned_user_id', filterUserId);
      }
      if (filters?.filterDealStatus && filters.filterDealStatus !== 'all') {
        query = query.eq('deal_status', filters.filterDealStatus);
      }
      if (normalizedSearch) {
        query = query.or(`name.ilike.%${normalizedSearch}%,phone.ilike.%${normalizedSearch}%`);
      }
      if (!normalizedSearch && filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }
      if (taggedLeadIds) {
        query = query.in('id', taggedLeadIds);
      }
      if (filters?.filterCampaign && filters.filterCampaign !== 'all') {
        query = query.eq('lead_meta.campaign_name', filters.filterCampaign);
      }
      if (filters?.filterAdSet && filters.filterAdSet !== 'all') {
        query = query.eq('lead_meta.adset_name', filters.filterAdSet);
      }
      if (filters?.filterAd && filters.filterAd !== 'all') {
        query = query.eq('lead_meta.ad_name', filters.filterAd);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Buscar tags dos novos leads
      const leadIds = (data || []).map((l: any) => l.id);
      let tagsByLead: Record<string, { id: string; name: string; color: string }[]> = {};
      
      if (leadIds.length > 0) {
        const { data: leadTags } = await supabase
          .from('lead_tags')
          .select('lead_id, tag:tags(id, name, color)')
          .in('lead_id', leadIds);
        
        tagsByLead = (leadTags || []).reduce((acc, lt) => {
          if (!acc[lt.lead_id]) acc[lt.lead_id] = [];
          if (lt.tag) acc[lt.lead_id].push(lt.tag as any);
          return acc;
        }, {} as Record<string, { id: string; name: string; color: string }[]>);
      }
      
      // Buscar fotos do WhatsApp
      const leadsWithPhone = (data || []).filter((l: any) => l.phone);
      let phoneToWhatsApp: Map<string, { picture: string | null; unread_count: number }> = new Map();
      
      if (leadsWithPhone.length > 0) {
        const phoneNumbers: string[] = [];
        leadsWithPhone.forEach((l: any) => {
          const cleaned = l.phone.replace(/\D/g, '');
          if (!cleaned) return;
          phoneNumbers.push(cleaned);
          if (cleaned.startsWith('55') && cleaned.length >= 12) {
            phoneNumbers.push(cleaned.substring(2));
          } else {
            phoneNumbers.push('55' + cleaned);
          }
        });
        const uniquePhones = [...new Set(phoneNumbers.filter(Boolean))];
        
        const { data: conversations } = uniquePhones.length > 0
          ? await supabase
              .from('whatsapp_conversations')
              .select('contact_phone, contact_picture, unread_count')
              .in('contact_phone', uniquePhones)
              .is('deleted_at', null)
          : { data: [] };
        
        (conversations || []).forEach(c => {
          if (c.contact_phone) {
            const normalized = normalizePhone(c.contact_phone);
            if (normalized) {
              const existing = phoneToWhatsApp.get(normalized);
              phoneToWhatsApp.set(normalized, {
                picture: c.contact_picture || existing?.picture || null,
                unread_count: (existing?.unread_count || 0) + (c.unread_count || 0),
              });
            }
          }
        });
      }
      
      // Buscar tasks_count para os novos leads
      let tasksByLead2: Record<string, { pending: number; completed: number }> = {};
      if (leadIds.length > 0) {
        const { data: taskCounts } = await supabase
          .from('lead_tasks')
          .select('lead_id, is_done')
          .in('lead_id', leadIds);
        
        (taskCounts || []).forEach((t: any) => {
          if (!tasksByLead2[t.lead_id]) tasksByLead2[t.lead_id] = { pending: 0, completed: 0 };
          if (t.is_done) {
            tasksByLead2[t.lead_id].completed++;
          } else {
            tasksByLead2[t.lead_id].pending++;
          }
        });
      }
      
      // Enriquecer leads com tags e fotos
      const enrichedLeads = (data || []).map((lead: any) => {
        let whatsapp_picture: string | null = null;
        let unread_count = 0;
        if (lead.phone) {
          const normalizedPhone = normalizePhone(lead.phone);
          const whatsappData = phoneToWhatsApp.get(normalizedPhone);
          whatsapp_picture = whatsappData?.picture || null;
          unread_count = whatsappData?.unread_count || 0;
        }
        
        return {
          ...lead,
          tags: tagsByLead[lead.id] || [],
          tasks_count: tasksByLead2[lead.id] || { pending: 0, completed: 0 },
          whatsapp_picture,
          unread_count,
        };
      });
      
      return { stageId, leads: enrichedLeads };
    },
    onSuccess: ({ stageId, leads }, { pipelineId, filterUserId, filters }) => {
      // Build matching cache key
      const dateFromISO = filters?.dateRange?.from?.toISOString();
      const dateToISO = filters?.dateRange?.to?.toISOString();
      const cacheKey = ['stages-with-leads', pipelineId, filterUserId, dateFromISO, dateToISO, filters?.filterTag, filters?.filterDealStatus, filters?.searchQuery];
      // Mesclar novos leads no cache existente
      queryClient.setQueryData(cacheKey, (old: any[] | undefined) => {
        if (!old) return old;
        
        return old.map(stage => {
          if (stage.id !== stageId) return stage;
          
          // Adicionar novos leads evitando duplicatas
          const existingIds = new Set((stage.leads || []).map((l: any) => l.id));
          const newLeads = leads.filter((l: any) => !existingIds.has(l.id));
          
          return {
            ...stage,
            leads: [...(stage.leads || []), ...newLeads],
            has_more: stage.total_lead_count > (stage.leads?.length || 0) + newLeads.length,
          };
        });
      });
    },
  });
}
