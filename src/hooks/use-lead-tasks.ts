import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

export type LeadTask = Tables<'lead_tasks'>;

export function useLeadTasks(leadId?: string) {
  return useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .order('day_offset')
        .order('created_at');
      
      if (error) throw error;
      return data as LeadTask[];
    },
    enabled: !!leadId,
  });
}

export function useToggleLeadTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_done, leadId }: { id: string; is_done: boolean; leadId?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('lead_tasks')
        .update({
          is_done,
          done_at: is_done ? new Date().toISOString() : null,
          done_by: is_done ? user.user?.id : null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create activity when task is marked as done
      if (is_done && leadId) {
        await supabase.from('activities').insert({
          lead_id: leadId,
          type: data.type, // 'call', 'message', 'email', 'note'
          content: data.title,
          user_id: user.user?.id,
          metadata: {
            task_id: data.id,
            task_type: data.type,
            day_offset: data.day_offset,
          },
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (data?.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['lead-history-v2', data.lead_id] });
      }
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    },
  });
}

export function useCreateLeadTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: {
      lead_id: string;
      day_offset: number;
      type: 'call' | 'message' | 'email' | 'note';
      title: string;
      description?: string;
      due_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks'] });
      toast.success('Tarefa criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });
}

// Complete a cadence task from template - creates lead_task if not exists, marks as done, creates activity
export function useCompleteCadenceTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      leadId, 
      templateTaskId,
      dayOffset,
      type,
      title,
      description,
      outcome,
      outcomeNotes
    }: { 
      leadId: string; 
      templateTaskId: string;
      dayOffset: number;
      type: 'call' | 'message' | 'email' | 'note';
      title: string;
      description?: string;
      outcome?: string;
      outcomeNotes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Check if lead_task already exists for this template task
      const { data: existingTask } = await supabase
        .from('lead_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .eq('title', title)
        .eq('day_offset', dayOffset)
        .eq('type', type)
        .maybeSingle();
      
      let taskData;
      
      if (existingTask) {
        // Toggle existing task
        const newIsDone = !existingTask.is_done;
        const { data, error } = await supabase
          .from('lead_tasks')
          .update({
            is_done: newIsDone,
            done_at: newIsDone ? new Date().toISOString() : null,
            done_by: newIsDone ? user.user?.id : null,
            outcome: newIsDone ? outcome : null,
            outcome_notes: newIsDone ? outcomeNotes : null,
          })
          .eq('id', existingTask.id)
          .select()
          .single();
        
        if (error) throw error;
        taskData = data;
        
        // Create activity only when marking as done
        if (newIsDone) {
          await supabase.from('activities').insert({
            lead_id: leadId,
            type: type,
            content: title,
            user_id: user.user?.id,
            metadata: {
              task_id: data.id,
              task_type: type,
              day_offset: dayOffset,
              outcome: outcome,
              outcome_notes: outcomeNotes,
            },
          });
        }
      } else {
        // Create new lead_task and mark as done
        const { data, error } = await supabase
          .from('lead_tasks')
          .insert({
            lead_id: leadId,
            day_offset: dayOffset,
            type,
            title,
            description,
            is_done: true,
            done_at: new Date().toISOString(),
            done_by: user.user?.id,
            outcome: outcome,
            outcome_notes: outcomeNotes,
          })
          .select()
          .single();
        
        if (error) throw error;
        taskData = data;
        
        // Create activity
        await supabase.from('activities').insert({
          lead_id: leadId,
          type: type,
          content: title,
          user_id: user.user?.id,
          metadata: {
            task_id: data.id,
            task_type: type,
            day_offset: dayOffset,
            outcome: outcome,
            outcome_notes: outcomeNotes,
          },
        });
      }
      
      return taskData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (data?.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['lead-history-v2', data.lead_id] });
      }
    },
    onError: (error) => {
      toast.error('Erro ao completar tarefa: ' + error.message);
    },
  });
}
