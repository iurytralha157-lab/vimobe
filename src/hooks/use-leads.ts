import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { normalizePhone } from '@/lib/phone-utils';
import { notifyLeadCreated } from './use-lead-notifications';
import { logAuditAction } from './use-audit-logs';
export type Lead = Tables<'leads'> & {
  tags?: { id: string; name: string; color: string }[];
  assignee?: { id: string; name: string; avatar_url: string | null };
  stage?: { id: string; name: string; color: string; stage_key: string };
};

// Campos otimizados para listagem (evita SELECT *)
const LEAD_LIST_FIELDS = `
  id, name, phone, email, source, created_at, updated_at,
  stage_id, assigned_user_id, pipeline_id, organization_id,
  property_code, message, deal_status, won_at, lost_at,
  stage:stages(id, name, color, stage_key),
  assignee:users!leads_assigned_user_id_fkey(id, name, avatar_url)
`;

export function useLeads(filters?: { 
  stageId?: string; 
  assigneeId?: string; 
  search?: string;
  limit?: number;
}) {
  const limit = filters?.limit || 200;
  
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(LEAD_LIST_FIELDS)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (filters?.stageId) {
        query = query.eq('stage_id', filters.stageId);
      }
      if (filters?.assigneeId) {
        query = query.eq('assigned_user_id', filters.assigneeId);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      // Buscar tags apenas para os leads retornados (batch otimizado)
      const leadIds = (data || []).map(l => l.id);
      if (leadIds.length === 0) return [] as Lead[];

      const { data: leadTags } = await supabase
        .from('lead_tags')
        .select('lead_id, tag:tags(id, name, color)')
        .in('lead_id', leadIds);

      const tagsByLead = (leadTags || []).reduce((acc, lt) => {
        if (!acc[lt.lead_id]) acc[lt.lead_id] = [];
        if (lt.tag) acc[lt.lead_id].push(lt.tag as any);
        return acc;
      }, {} as Record<string, { id: string; name: string; color: string }[]>);

      return (data || []).map(lead => ({
        ...lead,
        tags: tagsByLead[lead.id] || [],
      })) as Lead[];
    },
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          stage:stages(id, name, color, stage_key),
          assignee:users!leads_assigned_user_id_fkey(id, name, avatar_url)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Get tags
      const { data: leadTags } = await supabase
        .from('lead_tags')
        .select('tag:tags(id, name, color)')
        .eq('lead_id', id);
      
      return {
        ...data,
        tags: (leadTags || []).map(lt => lt.tag).filter(Boolean),
      } as Lead;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lead: {
      name: string;
      phone?: string;
      email?: string;
      message?: string;
      source?: string;
      stage_id?: string;
      pipeline_id?: string;
      property_code?: string;
      assigned_user_id?: string;
      tag_ids?: string[];
      // Additional profile fields
      cargo?: string;
      empresa?: string;
      profissao?: string;
      endereco?: string;
      cidade?: string;
      uf?: string;
      renda_familiar?: string;
      faixa_valor_imovel?: string;
      valor_interesse?: number | null;
      property_id?: string;
      deal_status?: string;
    }) => {
      // Buscar usuário autenticado - org_id é definido pelo trigger enforce_organization_id()
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');
      
      // Buscar org_id para verificação de leads duplicados (não para INSERT)
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.user.id)
        .single();
      const organizationId = userData?.organization_id;
      
      if (!organizationId) throw new Error('Usuário não possui organização');
      
      // ===== VERIFICAR SE JÁ EXISTE LEAD COM ESTE TELEFONE =====
      if (lead.phone) {
        const normalizedPhone = normalizePhone(lead.phone);
        
        if (normalizedPhone) {
          // Buscar leads existentes com telefone similar
          const { data: existingLeads } = await supabase
            .from('leads')
            .select('id, phone')
            .eq('organization_id', organizationId)
            .not('phone', 'is', null);
          
          // Verificar se algum lead tem o mesmo telefone normalizado
          const existingLead = existingLeads?.find(l => {
            if (!l.phone) return false;
            return normalizePhone(l.phone) === normalizedPhone;
          });
          
          if (existingLead) {
            // Atualizar lead existente ao invés de criar novo
            const updateData: any = {};
            if (lead.name && lead.name !== 'unknown') updateData.name = lead.name;
            if (lead.email) updateData.email = lead.email;
            if (lead.message) updateData.message = lead.message;
            if (lead.property_code) updateData.property_code = lead.property_code;
            if (lead.assigned_user_id) updateData.assigned_user_id = lead.assigned_user_id;
            if (lead.stage_id) updateData.stage_id = lead.stage_id;
            if (lead.pipeline_id) updateData.pipeline_id = lead.pipeline_id;
            
            // Registrar atividade de reentrada no histórico
            const { data: userData } = await supabase.auth.getUser();
            await supabase.from('activities').insert({
              lead_id: existingLead.id,
              type: 'lead_reentry',
              content: `Lead entrou novamente${lead.source ? ` via ${lead.source}` : ''}`,
              user_id: userData.user?.id || null,
              metadata: {
                source: lead.source || 'manual',
                new_data: updateData,
                original_phone: lead.phone,
              }
            });
            
            if (Object.keys(updateData).length > 0) {
              const { data: updatedLead, error: updateError } = await supabase
                .from('leads')
                .update(updateData)
                .eq('id', existingLead.id)
                .select()
                .single();
              
              if (updateError) throw updateError;
              
              // Add tags if provided
              if (lead.tag_ids && lead.tag_ids.length > 0) {
                for (const tagId of lead.tag_ids) {
                  await supabase
                    .from('lead_tags')
                    .upsert({ lead_id: existingLead.id, tag_id: tagId }, { onConflict: 'lead_id,tag_id' });
                }
              }
              
              toast.success('Lead atualizado (telefone já existia)');
              return updatedLead;
            }
            
            toast.info('Lead já existe com este telefone');
            return existingLead;
          }
        }
      }
      
      // Get default pipeline and first stage if not provided
      let pipelineId = lead.pipeline_id;
      let stageId = lead.stage_id;
      
      if (!pipelineId) {
        const { data: pipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_default', true)
          .single();
        
        pipelineId = pipeline?.id;
      }
      
      if (!stageId && pipelineId) {
        const { data: stage } = await supabase
          .from('stages')
          .select('id')
          .eq('pipeline_id', pipelineId)
          .order('position')
          .limit(1)
          .single();
        
        stageId = stage?.id;
      }
      
      const { tag_ids, ...leadData } = lead;
      
      // O trigger enforce_organization_id() vai sobrescrever organization_id
      // mas precisamos incluí-lo para satisfazer o TypeScript
      const insertData = {
        ...leadData,
        organization_id: organizationId!, // Será sobrescrito pelo trigger
        pipeline_id: pipelineId,
        stage_id: stageId,
        source: (lead.source || 'manual') as any,
      };
      
      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Add tags if provided
      if (tag_ids && tag_ids.length > 0) {
        await supabase
          .from('lead_tags')
          .insert(tag_ids.map(tagId => ({ lead_id: data.id, tag_id: tagId })));
      }
      
      // Vincular conversas WhatsApp existentes ao novo lead
      if (lead.phone) {
        const normalizedPhone = normalizePhone(lead.phone);
        
        if (normalizedPhone) {
          // Buscar conversas sem lead vinculado
          const { data: conversations } = await supabase
            .from('whatsapp_conversations')
            .select('id, contact_phone')
            .is('lead_id', null);
          
          // Atualizar conversas que correspondem ao telefone
          for (const conv of conversations || []) {
            if (conv.contact_phone && normalizePhone(conv.contact_phone) === normalizedPhone) {
              await supabase
                .from('whatsapp_conversations')
                .update({ lead_id: data.id })
                .eq('id', conv.id);
            }
          }
        }
      }
      
      // Log activity: lead created
      await supabase.from('activities').insert({
        lead_id: data.id,
        user_id: user.user.id,
        type: 'lead_created',
        content: `Lead "${lead.name}" foi criado`,
      });
      
      // Audit log: lead created
      logAuditAction(
        'create',
        'lead',
        data.id,
        undefined,
        { name: lead.name, phone: lead.phone, source: lead.source || 'manual' },
        organizationId
      ).catch(console.error);
      
      // Notificar todas as partes interessadas (vendedor, líderes, admins)
      await notifyLeadCreated({
        leadId: data.id,
        leadName: lead.name,
        organizationId: organizationId,
        pipelineId: pipelineId,
        assignedUserId: lead.assigned_user_id,
        source: lead.source || 'manual',
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['telecom-customers'] });
      queryClient.invalidateQueries({ queryKey: ['telecom-customer-stats'] });
      toast.success('Lead criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lead: ' + error.message);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const updateData: any = { ...updates };
      delete updateData.tags;
      delete updateData.assignee;
      delete updateData.stage;
      
      // Check if this is a stage change
      const isStageChange = !!updates.stage_id;
      const isAssigneeChange = updates.assigned_user_id !== undefined;
      
      if (isStageChange) {
        updateData.stage_entered_at = new Date().toISOString();
      }
      
      // Get current lead data for comparison
      const { data: currentLead } = await supabase
        .from('leads')
        .select('name, assigned_user_id, stage_id')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log activity based on what changed
      if (user?.user?.id) {
        // Check if it's a contact info update (not stage/assignee)
        const contactFields = ['name', 'phone', 'email', 'cargo', 'empresa', 'endereco', 
          'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep', 'message', 
          'valor_interesse', 'property_id', 'property_code'];
        
        const isContactUpdate = Object.keys(updates).some(key => contactFields.includes(key));
        
        if (isContactUpdate && !isStageChange && !isAssigneeChange) {
          const fieldsUpdated = Object.keys(updates).filter(k => contactFields.includes(k));
          await supabase.from('activities').insert({
            lead_id: id,
            user_id: user.user.id,
            type: 'contact_updated',
            content: 'Informações de contato atualizadas',
            metadata: { fields_updated: fieldsUpdated }
          });
        }
        
        // Log assignee change
        if (isAssigneeChange && currentLead?.assigned_user_id !== updates.assigned_user_id) {
          let content = 'Responsável removido';
          if (updates.assigned_user_id) {
            const { data: newAssignee } = await supabase
              .from('users')
              .select('name')
              .eq('id', updates.assigned_user_id)
              .single();
            content = newAssignee?.name 
              ? `Responsável alterado para ${newAssignee.name}`
              : 'Responsável alterado';
          }
          
          await supabase.from('activities').insert({
            lead_id: id,
            user_id: user.user.id,
            type: 'assignee_changed',
            content,
            metadata: { 
              old_assignee_id: currentLead?.assigned_user_id || null,
              new_assignee_id: updates.assigned_user_id || null 
            }
          });
        }
      }
      
      // Audit log: lead updated
      logAuditAction(
        'update',
        'lead',
        id,
        { stage_id: currentLead?.stage_id, assigned_user_id: currentLead?.assigned_user_id, name: currentLead?.name },
        updates,
        data.organization_id
      ).catch(console.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['lead-history-v2', data.id] });
      }
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lead: ' + error.message);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch lead data before deleting for audit log
      const { data: leadData } = await supabase
        .from('leads')
        .select('name, phone, organization_id')
        .eq('id', id)
        .single();
      
      // Delete related notifications first to avoid FK constraint violation
      const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .eq('lead_id', id);
      
      if (notifError) throw notifError;

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Audit log: lead deleted
      if (leadData) {
        logAuditAction(
          'delete',
          'lead',
          id,
          { name: leadData.name, phone: leadData.phone },
          undefined,
          leadData.organization_id || undefined
        ).catch(console.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-list'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      toast.success('Contato excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir lead: ' + error.message);
    },
  });
}

export function useAddLeadTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Verificar se a tag já está associada ao lead
      const { data: existingTag } = await supabase
        .from('lead_tags')
        .select('id')
        .eq('lead_id', leadId)
        .eq('tag_id', tagId)
        .maybeSingle();
      
      if (existingTag) {
        throw new Error('TAG_ALREADY_EXISTS');
      }
      
      const { error } = await supabase
        .from('lead_tags')
        .insert({ lead_id: leadId, tag_id: tagId });
      
      if (error) throw error;
      
      // Log activity
      if (user?.user?.id) {
        const { data: tag } = await supabase
          .from('tags')
          .select('name')
          .eq('id', tagId)
          .single();
        
        await supabase.from('activities').insert({
          lead_id: leadId,
          user_id: user.user.id,
          type: 'tag_added',
          content: `Tag "${tag?.name || 'Desconhecida'}" adicionada`,
          metadata: { tag_id: tagId, tag_name: tag?.name }
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['lead-history-v2', variables.leadId] });
      toast.success('Tag adicionada!');
    },
    onError: (error: any) => {
      if (error.message === 'TAG_ALREADY_EXISTS' || error.message?.includes('unique constraint')) {
        toast.info('Esta tag já está adicionada ao lead');
      } else {
        toast.error('Erro ao adicionar tag: ' + error.message);
      }
    },
  });
}

export function useRemoveLeadTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get tag name before deleting
      const { data: tag } = await supabase
        .from('tags')
        .select('name')
        .eq('id', tagId)
        .single();
      
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);
      
      if (error) throw error;
      
      // Log activity
      if (user?.user?.id) {
        await supabase.from('activities').insert({
          lead_id: leadId,
          user_id: user.user.id,
          type: 'tag_removed',
          content: `Tag "${tag?.name || 'Desconhecida'}" removida`,
          metadata: { tag_id: tagId, tag_name: tag?.name }
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      queryClient.invalidateQueries({ queryKey: ['stages-with-leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['lead-history-v2', variables.leadId] });
      toast.success('Tag removida!');
    },
    onError: (error) => {
      toast.error('Erro ao remover tag: ' + error.message);
    },
  });
}
