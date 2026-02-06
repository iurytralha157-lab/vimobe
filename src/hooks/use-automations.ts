import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export type TriggerType = 
  | 'message_received' 
  | 'scheduled' 
  | 'lead_stage_changed' 
  | 'lead_created' 
  | 'tag_added' 
  | 'inactivity' 
  | 'manual';

export type NodeType = 'trigger' | 'action' | 'condition' | 'delay';

export type ActionType = 
  | 'send_whatsapp' 
  | 'send_whatsapp_template' 
  | 'send_email' 
  | 'move_lead' 
  | 'add_tag' 
  | 'remove_tag' 
  | 'create_task' 
  | 'assign_user' 
  | 'webhook';

export interface Automation {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_config: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationNode {
  id: string;
  automation_id: string;
  node_type: NodeType;
  action_type: ActionType | null;
  config: Json;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface AutomationConnection {
  id: string;
  automation_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  condition_branch: string | null;
}

export interface AutomationExecution {
  id: string;
  automation_id: string;
  lead_id: string | null;
  conversation_id: string | null;
  organization_id: string;
  status: string;
  current_node_id: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  execution_data: Json;
  next_execution_at: string | null;
  // Joined data
  lead?: {
    id: string;
    name: string | null;
  } | null;
  automation?: {
    id: string;
    name: string;
  } | null;
}

export interface AutomationTemplate {
  id: string;
  organization_id: string;
  name: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationWithNodes extends Automation {
  nodes: AutomationNode[];
  connections: AutomationConnection[];
}

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  message_received: 'Mensagem Recebida',
  scheduled: 'Agendado',
  lead_stage_changed: 'Lead Mudou de Etapa',
  lead_created: 'Lead Criado',
  tag_added: 'Tag Adicionada',
  inactivity: 'Inatividade',
  manual: 'Manual',
};

export const TRIGGER_TYPE_DESCRIPTIONS: Record<TriggerType, string> = {
  message_received: 'Dispara quando uma mensagem é recebida no WhatsApp',
  scheduled: 'Dispara em horários programados (cron)',
  lead_stage_changed: 'Dispara quando um lead muda de etapa',
  lead_created: 'Dispara quando um novo lead é criado',
  tag_added: 'Dispara quando uma tag é adicionada a um lead',
  inactivity: 'Dispara após período de inatividade do lead',
  manual: 'Disparo manual por ação do usuário',
};

// Fetch all automations for the organization
export function useAutomations() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['automations', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Automation[];
    },
    enabled: !!profile?.organization_id,
  });
}

// Fetch a single automation with nodes and connections
export function useAutomation(automationId: string) {
  return useQuery({
    queryKey: ['automation', automationId],
    queryFn: async () => {
      const [automationRes, nodesRes, connectionsRes] = await Promise.all([
        supabase.from('automations').select('*').eq('id', automationId).single(),
        supabase.from('automation_nodes').select('*').eq('automation_id', automationId).order('created_at'),
        (supabase as any).from('automation_connections').select('*').eq('automation_id', automationId),
      ]);

      if (automationRes.error) throw automationRes.error;

      // Map node_config to config for compatibility
      const nodes = (nodesRes.data || []).map((node: any) => ({
        ...node,
        config: node.node_config,
      }));

      return {
        ...automationRes.data,
        nodes,
        connections: connectionsRes.data || [],
      } as unknown as AutomationWithNodes;
    },
    enabled: !!automationId,
  });
}

// Create a new automation
export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      trigger_type: TriggerType;
      trigger_config?: Record<string, unknown>;
    }) => {
      if (!profile?.organization_id) throw new Error('No organization');

      const { data: automation, error } = await supabase
        .from('automations')
        .insert([{
          organization_id: profile.organization_id,
          name: data.name,
          description: data.description || null,
          trigger_type: data.trigger_type,
          trigger_config: (data.trigger_config || {}) as Json,
          created_by: profile.id,
          is_active: false,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create default trigger node
      await supabase.from('automation_nodes').insert([{
        automation_id: automation.id,
        node_type: 'trigger',
        node_config: { trigger_type: data.trigger_type, ...(data.trigger_config || {}) } as Json,
        position_x: 250,
        position_y: 50,
      }]);

      return automation as Automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar automação: ${error.message}`);
    },
  });
}

// Update automation
export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Automation> & { id: string }) => {
      const { error } = await supabase
        .from('automations')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', variables.id] });
    },
  });
}

// Delete automation
export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação excluída!');
    },
  });
}

// Toggle automation active state
export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('automations')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });
}

// Save entire flow (nodes + connections)
export function useSaveAutomationFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      automationId,
      nodes,
      connections,
    }: {
      automationId: string;
      nodes: Partial<AutomationNode>[];
      connections: Partial<AutomationConnection>[];
    }) => {
      // Delete existing nodes and connections
      await supabase.from('automation_connections').delete().eq('automation_id', automationId);
      await supabase.from('automation_nodes').delete().eq('automation_id', automationId);

      // Insert new nodes
      const nodesToInsert = nodes.map((node) => ({
        automation_id: automationId,
        node_type: node.node_type || 'action',
        action_type: node.action_type || null,
        node_config: (node.config || {}) as Json,
        position_x: node.position_x || 0,
        position_y: node.position_y || 0,
      }));

      const { data: insertedNodes, error: nodesError } = await supabase
        .from('automation_nodes')
        .insert(nodesToInsert)
        .select();

      if (nodesError) throw nodesError;

      // Map old IDs to new IDs for connections
      const idMap = new Map<string, string>();
      nodes.forEach((node, index) => {
        const originalId = node.id;
        if (originalId && insertedNodes[index]) {
          idMap.set(originalId, insertedNodes[index].id);
        }
      });

      // Insert new connections with mapped IDs
      if (connections.length > 0) {
        const connectionsToInsert = connections
          .filter((conn) => {
            // Only insert if both source and target IDs are properly mapped
            const sourceId = idMap.get(conn.source_node_id || '');
            const targetId = idMap.get(conn.target_node_id || '');
            return sourceId && targetId;
          })
          .map((conn) => ({
            automation_id: automationId,
            source_node_id: idMap.get(conn.source_node_id || '')!,
            target_node_id: idMap.get(conn.target_node_id || '')!,
            source_handle: conn.source_handle || null,
            condition_branch: conn.condition_branch || 'default',
          }));

        if (connectionsToInsert.length > 0) {
          const { error: connError } = await supabase
            .from('automation_connections')
            .insert(connectionsToInsert);

          if (connError) throw connError;
        }
      }

      return { nodes: insertedNodes };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automation', variables.automationId] });
    },
  });
}

// Automation templates
export function useAutomationTemplates() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['automation-templates', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutomationTemplate[];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; content: string; media_url?: string; media_type?: string }) => {
      if (!profile?.organization_id) throw new Error('No organization');

      const { error } = await supabase.from('automation_templates').insert([{
        organization_id: profile.organization_id,
        name: data.name,
        content: data.content,
        media_url: data.media_url || null,
        media_type: data.media_type || null,
        created_by: profile.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-templates'] });
      toast.success('Template criado!');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-templates'] });
      toast.success('Template excluído!');
    },
  });
}

// Cancel a specific automation execution
export function useCancelExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from('automation_executions')
        .update({ 
          status: 'cancelled', 
          completed_at: new Date().toISOString(),
          error_message: 'Cancelado manualmente pelo usuário'
        })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      toast.success('Automação interrompida!');
    },
  });
}

// Execution logs
export function useAutomationExecutions(automationId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['automation-executions', automationId, profile?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('automation_executions')
        .select(`
          *,
          lead:leads(id, name),
          automation:automations(id, name)
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (automationId) {
        query = query.eq('automation_id', automationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AutomationExecution[];
    },
    enabled: !!profile?.organization_id,
    refetchInterval: 10000, // Refetch every 10 seconds to show live updates
  });
}
