import { useMemo } from 'react';
import { useActivities, Activity } from '@/hooks/use-activities';
import { useLeadTimeline, LeadTimelineEvent } from '@/hooks/use-lead-timeline';

export interface UnifiedHistoryEvent {
  id: string;
  type: string;
  label: string;
  content?: string | null;
  timestamp: string;
  actor?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  } | null;
  source: 'timeline' | 'activity';
  metadata?: Record<string, any> | null;
  channel?: string | null;
  isAutomation?: boolean;
}

// Mapping for timeline event types
const timelineEventLabels: Record<string, string> = {
  lead_created: 'Lead criado',
  lead_assigned: 'Atribuído',
  first_response: 'Primeira resposta',
  whatsapp_message_sent: 'Mensagem enviada',
  whatsapp_message_received: 'Mensagem recebida',
  call_initiated: 'Ligação iniciada',
  stage_changed: 'Estágio alterado',
  note_created: 'Nota adicionada',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  sla_warning: 'SLA em alerta',
  sla_overdue: 'SLA estourado',
};

// Mapping for activity types
const activityLabels: Record<string, string> = {
  stage_change: 'Movido para',
  note: 'Nota adicionada',
  call: 'Ligação realizada',
  email: 'Email enviado',
  message: 'Mensagem enviada',
  task_completed: 'Tarefa concluída',
  lead_created: 'Lead criado',
  contact_updated: 'Contato atualizado',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  assignee_changed: 'Responsável alterado',
  lead_reentry: 'Lead reentrou',
};

function getTimelineEventDetails(event: LeadTimelineEvent): string | undefined {
  const metadata = event.metadata || {};
  
  switch (event.event_type) {
    case 'lead_created':
      return metadata.source ? `Origem: ${metadata.source}` : undefined;
    case 'stage_changed':
      const from = metadata.old_stage_name;
      const to = metadata.new_stage_name;
      return from && to ? `${from} → ${to}` : undefined;
    case 'first_response':
      const responseTime = metadata.response_seconds;
      if (responseTime !== undefined) {
        const minutes = Math.floor(responseTime / 60);
        const seconds = responseTime % 60;
        return `Tempo: ${minutes}m ${seconds}s`;
      }
      return undefined;
    default:
      return undefined;
  }
}

function getActivityDetails(activity: Activity): string | undefined {
  if (activity.content) return activity.content;
  
  if (activity.metadata && typeof activity.metadata === 'object') {
    const meta = activity.metadata as any;
    if (meta.from_stage && meta.to_stage) {
      return `${meta.from_stage} → ${meta.to_stage}`;
    }
  }
  
  return undefined;
}

export function useLeadFullHistory(leadId: string) {
  const { data: timeline = [], isLoading: timelineLoading } = useLeadTimeline(leadId);
  const { data: activities = [], isLoading: activitiesLoading } = useActivities(leadId);

  const merged = useMemo(() => {
    // Convert timeline events
    const timelineEvents: UnifiedHistoryEvent[] = timeline.map((e) => ({
      id: `timeline-${e.id}`,
      type: e.event_type,
      label: timelineEventLabels[e.event_type] || e.event_type,
      content: getTimelineEventDetails(e),
      timestamp: e.event_at,
      actor: e.actor ? {
        id: e.actor.id,
        name: e.actor.name,
        avatar_url: e.actor.avatar_url,
      } : null,
      source: 'timeline' as const,
      metadata: e.metadata,
      channel: e.channel,
      isAutomation: e.is_automation,
    }));

    // Convert activities
    const activityEvents: UnifiedHistoryEvent[] = activities.map((a) => ({
      id: `activity-${a.id}`,
      type: a.type,
      label: activityLabels[a.type] || a.type,
      content: getActivityDetails(a),
      timestamp: a.created_at,
      actor: a.user ? {
        id: a.user.id,
        name: a.user.name,
        avatar_url: undefined,
      } : null,
      source: 'activity' as const,
      metadata: a.metadata as Record<string, any> | null,
    }));

    // Merge and deduplicate by similar events (same type + close timestamp)
    const all = [...timelineEvents, ...activityEvents];
    
    // Sort by timestamp (most recent first)
    return all.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [timeline, activities]);

  return {
    data: merged,
    isLoading: timelineLoading || activitiesLoading,
  };
}
