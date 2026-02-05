import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { normalizePhone } from '@/lib/phone-utils';

export type Stage = Tables<'stages'> & {
  lead_count?: number;
};

// Limite de leads por estágio para paginação
const LEADS_PER_STAGE = 100;

// Campos otimizados para leads no pipeline - only columns that exist in the database
const LEAD_PIPELINE_FIELDS = `
  id, name, phone, email, source, created_at, 
  stage_id, assigned_user_id, pipeline_id, message,
  stage_entered_at,
  deal_status, valor_interesse, property_id, lost_reason, won_at, lost_at,
  interest_property_id, interest_plan_id,
  assignee:users!leads_assigned_user_id_fkey(id, name, avatar_url),
  interest_property:properties!leads_interest_property_id_fkey(id, code, title, preco),
  interest_plan:service_plans!leads_interest_plan_id_fkey(id, code, name, price)
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
      
      // Query otimizada: contar leads agrupados por stage em uma única query
      const { data: leadCounts } = await supabase
        .from('leads')
        .select('stage_id')
        .not('stage_id', 'is', null);
      
      const countsByStage = (leadCounts || []).reduce((acc, l) => {
        if (l.stage_id) {
          acc[l.stage_id] = (acc[l.stage_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      return (data || []).map(stage => ({
        ...stage,
        lead_count: countsByStage[stage.id] || 0,
      })) as Stage[];
    },
  });
}

export function useStagesWithLeads(pipelineId?: string) {
  return useQuery({
    queryKey: ['stages-with-leads', pipelineId],
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
      
      // Buscar leads paginados por estágio em paralelo
      const stageLeadsPromises = stages.map(stage =>
        (supabase as any)
          .from('leads')
          .select(LEAD_PIPELINE_FIELDS)
          .eq('pipeline_id', targetPipelineId)
          .eq('stage_id', stage.id)
          .order('stage_entered_at', { ascending: false })
          .range(0, LEADS_PER_STAGE - 1)
      );
      
      // Contagem total de leads por estágio
      const leadCountsResult = await supabase
        .from('leads')
        .select('stage_id')
        .eq('pipeline_id', targetPipelineId)
        .not('stage_id', 'is', null);
      
      const stageLeadsResults = await Promise.all(stageLeadsPromises);
      
      // Combinar leads de todos os estágios em um array plano
      const leads: any[] = [];
      const leadsByStageRaw: Record<string, any[]> = {};
      
      stages.forEach((stage, index) => {
        const stageLeads = stageLeadsResults[index]?.data || [];
        leadsByStageRaw[stage.id] = stageLeads;
        leads.push(...stageLeads);
      });
      
      // Contar leads por estágio para exibir total real no badge
      const totalCountsByStage = (leadCountsResult.data || []).reduce((acc: Record<string, number>, l: any) => {
        if (l.stage_id) {
          acc[l.stage_id] = (acc[l.stage_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Buscar tags apenas se houver leads
      const leadIds = leads.map((l: any) => l.id);
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
      
      // Buscar fotos e unread_count do WhatsApp para leads com telefone
      const leadsWithPhone = leads.filter((l: any) => l.phone);
      let phoneToWhatsApp: Map<string, { picture: string | null; unread_count: number }> = new Map();
      
      if (leadsWithPhone.length > 0) {
        const { data: conversations } = await supabase
          .from('whatsapp_conversations')
          .select('contact_phone, contact_picture, unread_count');
        
        // Criar mapa telefone normalizado → { foto, unread_count }
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
          if (lead.phone) {
            const normalizedPhone = normalizePhone(lead.phone);
            const whatsappData = phoneToWhatsApp.get(normalizedPhone);
            whatsapp_picture = whatsappData?.picture || null;
            unread_count = whatsappData?.unread_count || 0;
          }
          
          return {
            ...lead,
            tags: tagsByLead[lead.id] || [],
            stage: stagesById[stageId] || null,
            whatsapp_picture,
            unread_count,
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
      await supabase.from('stages').delete().eq('pipeline_id', id);
      
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
      offset 
    }: { 
      pipelineId: string; 
      stageId: string; 
      offset: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select(LEAD_PIPELINE_FIELDS)
        .eq('pipeline_id', pipelineId)
        .eq('stage_id', stageId)
        .order('stage_entered_at', { ascending: false })
        .range(offset, offset + LEADS_PER_STAGE - 1);
      
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
        const { data: conversations } = await supabase
          .from('whatsapp_conversations')
          .select('contact_phone, contact_picture, unread_count');
        
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
          whatsapp_picture,
          unread_count,
        };
      });
      
      return { stageId, leads: enrichedLeads };
    },
    onSuccess: ({ stageId, leads }, { pipelineId }) => {
      // Mesclar novos leads no cache existente
      queryClient.setQueryData(['stages-with-leads', pipelineId], (old: any[] | undefined) => {
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
