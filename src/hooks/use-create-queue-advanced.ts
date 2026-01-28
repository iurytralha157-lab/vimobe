import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScheduleDay {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
}

interface RuleCondition {
  id: string;
  type: 'source' | 'webhook' | 'whatsapp_session' | 'meta_form' | 'website_category' | 'campaign_contains' | 'tag' | 'city' | 'interest_property' | 'interest_plan';
  values: string[];
}

interface QueueMember {
  id?: string;
  type: 'user' | 'team';
  entityId: string;
  weight: number;
  name?: string;
}

interface QueueSettings {
  enable_redistribution?: boolean;
  preserve_position?: boolean;
  require_checkin?: boolean;
}

interface CreateQueueInput {
  name: string;
  strategy: 'simple' | 'weighted';
  target_pipeline_id: string;
  target_stage_id: string;
  is_active: boolean;
  settings: QueueSettings;
  schedule: ScheduleDay[];
  conditions: RuleCondition[];
  members: QueueMember[];
}

export function useCreateQueueAdvanced() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateQueueInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');
      
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();
      
      if (!profile?.organization_id) throw new Error('Organização não encontrada');
      
      // Combine settings with schedule
      const fullSettings = {
        ...input.settings,
        schedule: input.schedule.map(s => ({
          day: s.day,
          enabled: s.enabled,
          start: s.start,
          end: s.end,
        })),
      };
      
      // Create round robin
      const { data: roundRobin, error: rrError } = await supabase
        .from('round_robins')
        .insert({
          name: input.name,
          strategy: input.strategy,
          organization_id: profile.organization_id,
          is_active: input.is_active,
          target_pipeline_id: input.target_pipeline_id || null,
          target_stage_id: input.target_stage_id || null,
          settings: fullSettings as any,
        })
        .select()
        .single();
      
      if (rrError) throw rrError;
      
      // Create rules from conditions
      if (input.conditions.length > 0) {
        const rulesToInsert = input.conditions.map((condition, index) => {
          // Build match JSONB based on condition type
          let matchValue: Record<string, any> = {};
          
          switch (condition.type) {
            case 'source':
              matchValue = { source: condition.values };
              break;
            case 'webhook':
              matchValue = { webhook_id: condition.values };
              break;
            case 'whatsapp_session':
              matchValue = { whatsapp_session_id: condition.values };
              break;
            case 'meta_form':
              matchValue = { meta_form_id: condition.values };
              break;
            case 'website_category':
              matchValue = { website_category: condition.values };
              break;
            case 'campaign_contains':
              matchValue = { campaign_name_contains: condition.values[0] };
              break;
            case 'tag':
              matchValue = { tag_in: condition.values };
              break;
            case 'city':
              matchValue = { city_in: condition.values };
              break;
            case 'interest_property':
              matchValue = { interest_property_id: condition.values[0] };
              break;
            case 'interest_plan':
              matchValue = { interest_plan_id: condition.values[0] };
              break;
          }
          
          return {
            round_robin_id: roundRobin.id,
            match_type: condition.type,
            match_value: condition.values.join(','),
            match: matchValue,
            priority: input.conditions.length - index,
            is_active: true,
          };
        });
        
        const { error: rulesError } = await supabase
          .from('round_robin_rules')
          .insert(rulesToInsert);
        
        if (rulesError) throw rulesError;
      }
      
      // Create members - only insert user members directly
      // For team members, we need to expand to individual users
      if (input.members.length > 0) {
        const membersToInsert: any[] = [];
        
        for (const member of input.members) {
          if (member.type === 'user') {
            membersToInsert.push({
              round_robin_id: roundRobin.id,
              user_id: member.entityId,
              team_id: null,
              weight: member.weight,
              position: membersToInsert.length,
            });
          } else if (member.type === 'team') {
            // Get all users from the team
            const { data: teamMembers } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('team_id', member.entityId);
            
            if (teamMembers && teamMembers.length > 0) {
              for (const tm of teamMembers) {
                membersToInsert.push({
                  round_robin_id: roundRobin.id,
                  user_id: tm.user_id,
                  team_id: member.entityId,
                  weight: member.weight,
                  position: membersToInsert.length,
                });
              }
            }
          }
        }
        
        if (membersToInsert.length > 0) {
          const { error: membersError } = await supabase
            .from('round_robin_members')
            .insert(membersToInsert);
          
          if (membersError) throw membersError;
        }
      }
      
      return roundRobin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robins'] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules'] });
      toast.success('Fila de distribuição criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar fila: ' + error.message);
    },
  });
}

export function useUpdateQueueAdvanced() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: CreateQueueInput & { id: string }) => {
      // Combine settings with schedule
      const fullSettings = {
        ...input.settings,
        schedule: input.schedule.map(s => ({
          day: s.day,
          enabled: s.enabled,
          start: s.start,
          end: s.end,
        })),
      };
      
      // Update round robin
      const { error: rrError } = await supabase
        .from('round_robins')
        .update({
          name: input.name,
          strategy: input.strategy,
          is_active: input.is_active,
          target_pipeline_id: input.target_pipeline_id || null,
          target_stage_id: input.target_stage_id || null,
          settings: fullSettings as any,
        })
        .eq('id', id);
      
      if (rrError) throw rrError;
      
      // Delete existing rules and recreate
      await supabase
        .from('round_robin_rules')
        .delete()
        .eq('round_robin_id', id);
      
      if (input.conditions.length > 0) {
        const rulesToInsert = input.conditions.map((condition, index) => {
          let matchValue: Record<string, any> = {};
          
          switch (condition.type) {
            case 'source':
              matchValue = { source: condition.values };
              break;
            case 'webhook':
              matchValue = { webhook_id: condition.values };
              break;
            case 'whatsapp_session':
              matchValue = { whatsapp_session_id: condition.values };
              break;
            case 'meta_form':
              matchValue = { meta_form_id: condition.values };
              break;
            case 'website_category':
              matchValue = { website_category: condition.values };
              break;
            case 'campaign_contains':
              matchValue = { campaign_name_contains: condition.values[0] };
              break;
            case 'tag':
              matchValue = { tag_in: condition.values };
              break;
            case 'city':
              matchValue = { city_in: condition.values };
              break;
            case 'interest_property':
              matchValue = { interest_property_id: condition.values[0] };
              break;
            case 'interest_plan':
              matchValue = { interest_plan_id: condition.values[0] };
              break;
          }
          
          return {
            round_robin_id: id,
            match_type: condition.type,
            match_value: condition.values.join(','),
            match: matchValue,
            priority: input.conditions.length - index,
            is_active: true,
          };
        });
        
        await supabase
          .from('round_robin_rules')
          .insert(rulesToInsert);
      }
      
      // Delete existing members and recreate
      await supabase
        .from('round_robin_members')
        .delete()
        .eq('round_robin_id', id);
      
      if (input.members.length > 0) {
        const membersToInsert: any[] = [];
        
        for (const member of input.members) {
          if (member.type === 'user') {
            membersToInsert.push({
              round_robin_id: id,
              user_id: member.entityId,
              team_id: null,
              weight: member.weight,
              position: membersToInsert.length,
            });
          } else if (member.type === 'team') {
            // Get all users from the team
            const { data: teamMembers } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('team_id', member.entityId);
            
            if (teamMembers && teamMembers.length > 0) {
              for (const tm of teamMembers) {
                membersToInsert.push({
                  round_robin_id: id,
                  user_id: tm.user_id,
                  team_id: member.entityId,
                  weight: member.weight,
                  position: membersToInsert.length,
                });
              }
            }
          }
        }
        
        if (membersToInsert.length > 0) {
          await supabase
            .from('round_robin_members')
            .insert(membersToInsert);
        }
      }
      
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round-robins'] });
      queryClient.invalidateQueries({ queryKey: ['round-robin-rules'] });
      toast.success('Fila atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar fila: ' + error.message);
    },
  });
}
