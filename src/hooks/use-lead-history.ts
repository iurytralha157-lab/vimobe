import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatResponseTime } from '@/hooks/use-lead-timeline';

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
  // enriched fields
  sourceOrigin?: string | null; // 'meta_ads' | 'whatsapp' | 'website' | 'manual' | 'webhook' | etc.
  webhookName?: string | null;
  firstResponseSeconds?: number | null;
}

// Types that only exist in activities (never in timeline) — no deduplication needed
const ACTIVITY_ONLY_TYPES = new Set([
  'call',
  'email',
  'note',
  'message',
  'task_completed',
  'contact_updated',
  'automation_message',
]);

// Types where timeline is authoritative — skip activity duplicate
const TIMELINE_AUTHORITY_TYPES = new Set([
  'lead_created',
  'lead_assigned',
  'stage_changed',
  'stage_change',
  'first_response',
  'whatsapp_message_sent',
  'whatsapp_message_received',
  'call_initiated',
  'note_created',
  'tag_added',
  'tag_removed',
  'sla_warning',
  'sla_overdue',
  'lead_reentry',
]);

function buildLabel(type: string, metadata: Record<string, any>, source: 'timeline' | 'activity'): string {
  switch (type) {
    case 'lead_created': {
      const src = metadata?.source_label || metadata?.source;
      if (!src) return 'Lead criado';
      if (src === 'meta_ads' || src === 'Meta Ads') return 'Lead criado via Meta Ads';
      if (src === 'whatsapp' || src === 'WhatsApp') return 'Lead criado via WhatsApp';
      if (src === 'webhook' || src === 'Webhook') {
        const name = metadata?.form_name || metadata?.webhook_name;
        return name ? `Lead criado via "${name}"` : 'Lead criado via Webhook';
      }
      if (src === 'website' || src === 'Site') return 'Lead criado via Site';
      if (src === 'manual') return 'Lead criado manualmente';
      return `Lead criado via ${src}`;
    }
    case 'lead_assigned': {
      const queueName = metadata?.distribution_queue_name || metadata?.queue_name;
      const assignedName = metadata?.assigned_user_name;
      if (queueName && assignedName) return `Distribuído via "${queueName}" → ${assignedName}`;
      if (queueName) return `Distribuído via "${queueName}"`;
      if (metadata?.destination === 'admin_fallback') return 'Atribuído ao administrador (sem fila ativa)';
      if (metadata?.destination === 'pool') return 'Enviado para o Pool';
      if (assignedName) return `Atribuído a ${assignedName}`;
      return 'Distribuído';
    }
    case 'stage_changed':
    case 'stage_change': {
      const from = metadata?.old_stage_name || metadata?.from_stage;
      const to = metadata?.new_stage_name || metadata?.to_stage;
      if (!from || from === 'Desconhecido' || from === 'Unknown') {
        return `Iniciado no estágio ${to || 'Base'}`;
      }
      if (from && to) return `Movido: ${from} → ${to}`;
      return 'Estágio alterado';
    }
    case 'first_response':
      return 'Primeira resposta';
    case 'whatsapp_message_sent':
      return 'Mensagem enviada (WhatsApp)';
    case 'whatsapp_message_received':
      return 'Mensagem recebida (WhatsApp)';
    case 'call_initiated':
      return 'Ligação iniciada';
    case 'note_created':
    case 'note':
      return 'Nota adicionada';
    case 'tag_added':
      return metadata?.tag_name ? `Tag "${metadata.tag_name}" adicionada` : 'Tag adicionada';
    case 'tag_removed':
      return metadata?.tag_name ? `Tag "${metadata.tag_name}" removida` : 'Tag removida';
    case 'sla_warning':
      return 'SLA em alerta';
    case 'sla_overdue':
      return 'SLA estourado';
    case 'call':
      return 'Ligação realizada';
    case 'email':
      return 'Email enviado';
    case 'message':
      return 'Mensagem enviada';
    case 'automation_message': {
      const ch = metadata?.channel || 'whatsapp';
      return `Mensagem automática (${ch === 'whatsapp' ? 'WhatsApp' : ch})`;
    }
    case 'task_completed':
      return 'Tarefa concluída';
    case 'contact_updated':
      return 'Contato atualizado';
    case 'assignee_changed': {
      if (metadata?.distribution_queue_name && metadata?.to_user_name) {
        const prefix = metadata?.is_initial_distribution === false ? 'Redistribuído' : 'Distribuído';
        return `${prefix} por "${metadata.distribution_queue_name}" → ${metadata.to_user_name}`;
      }
      if (!metadata?.to_user_id && !metadata?.to_user_name) return 'Responsável removido';
      if (metadata?.to_user_name) return `Atribuído a ${metadata.to_user_name}`;
      return 'Responsável alterado';
    }
    case 'lead_reentry': {
      if (metadata?.webhook_name) return `Lead reentrou via webhook "${metadata.webhook_name}"`;
      if (metadata?.source === 'whatsapp') return 'Lead reentrou via WhatsApp';
      return `Lead reentrou via ${metadata?.source || 'sistema'}`;
    }
    case 'automation_stage_move':
      return 'Movido por automação';
    case 'automation_tag_added':
      return 'Tag adicionada por automação';
    default: {
      if (metadata?.is_automation) return `Ação automática (${type})`;
      return type.replace(/_/g, ' ');
    }
  }
}

function buildContent(type: string, metadata: Record<string, any>): string | undefined {
  switch (type) {
    case 'first_response': {
      const secs = metadata?.response_seconds;
      if (secs !== undefined && secs !== null) {
        return `Tempo de resposta: ${formatResponseTime(Number(secs))}`;
      }
      return undefined;
    }
    case 'stage_changed':
    case 'stage_change': {
      const from = metadata?.old_stage_name || metadata?.from_stage;
      const to = metadata?.new_stage_name || metadata?.to_stage;
      const isInitial = !from || from === 'Desconhecido' || from === 'Unknown';
      if (!isInitial && from && to) return `${from} → ${to}`;
      return undefined;
    }
    default:
      return undefined;
  }
}

export function useLeadHistory(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-history-v2', leadId],
    queryFn: async (): Promise<UnifiedHistoryEvent[]> => {
      if (!leadId) return [];

      // Fetch both in parallel
      const [timelineResult, activitiesResult] = await Promise.all([
        supabase
          .from('lead_timeline_events')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true }),
        supabase
          .from('activities')
          .select('*, user:users(id, name, avatar_url)')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true }),
      ]);

      if (timelineResult.error) throw timelineResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      const timelineEvents = timelineResult.data || [];
      const activityEvents = activitiesResult.data || [];

      // Collect all user IDs that need resolution from metadata
      const userIdsToResolve = new Set<string>();
      [...timelineEvents, ...activityEvents].forEach((e: any) => {
        const meta = e.metadata || {};
        if (meta.user_id && typeof meta.user_id === 'string') userIdsToResolve.add(meta.user_id);
        if (meta.to_user_id && typeof meta.to_user_id === 'string') userIdsToResolve.add(meta.to_user_id);
        if (meta.from_user_id && typeof meta.from_user_id === 'string') userIdsToResolve.add(meta.from_user_id);
        if (e.user_id && typeof e.user_id === 'string') userIdsToResolve.add(e.user_id);
        if (e.actor_user_id && typeof e.actor_user_id === 'string') userIdsToResolve.add(e.actor_user_id);
      });

      // Resolve users
      const userMap = new Map<string, { id: string; name: string; avatar_url: string | null }>();
      if (userIdsToResolve.size > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', Array.from(userIdsToResolve));
        (usersData || []).forEach((u: any) => userMap.set(u.id, u));
      }

      // Build unified events from timeline
      const timelineMapped: UnifiedHistoryEvent[] = timelineEvents.map((e: any) => {
        const meta = (e.metadata as Record<string, any>) || {};
        const actorId = e.user_id || e.actor_user_id;
        const actor = actorId ? (userMap.get(actorId) || null) : null;

        return {
          id: `timeline-${e.id}`,
          type: e.event_type,
          label: buildLabel(e.event_type, meta, 'timeline'),
          content: buildContent(e.event_type, meta),
          timestamp: e.created_at || e.event_at,
          actor: actor ? { id: actor.id, name: actor.name, avatar_url: actor.avatar_url } : null,
          source: 'timeline' as const,
          metadata: meta,
          channel: e.channel || null,
          isAutomation: e.is_automation || false,
          sourceOrigin: meta.source || meta.source_label || null,
          webhookName: meta.webhook_name || meta.form_name || null,
          firstResponseSeconds: e.event_type === 'first_response' ? (meta.response_seconds ?? null) : null,
        };
      });

      // Track which timeline types exist for deduplication
      const timelineTypesPresent = new Set(timelineEvents.map((e: any) => e.event_type));

      // Build unified events from activities (with deduplication)
      const activityMapped: UnifiedHistoryEvent[] = activityEvents
        .filter((a: any) => {
          // Always include activity-only types
          if (ACTIVITY_ONLY_TYPES.has(a.type)) return true;
          // Skip if timeline already has authority over this type
          if (TIMELINE_AUTHORITY_TYPES.has(a.type) && timelineTypesPresent.has(a.type)) return false;
          // Also map stage_change → stage_changed
          if (a.type === 'stage_change' && timelineTypesPresent.has('stage_changed')) return false;
          return true;
        })
        .map((a: any) => {
          const meta = (a.metadata as Record<string, any>) || {};
          const actorId = a.user_id;
          const actorFromQuery = a.user;
          const actor = actorFromQuery || (actorId ? userMap.get(actorId) || null : null);

          return {
            id: `activity-${a.id}`,
            type: a.type,
            label: buildLabel(a.type, meta, 'activity'),
            content: a.content || buildContent(a.type, meta),
            timestamp: a.created_at,
            actor: actor ? { id: actor.id, name: actor.name, avatar_url: actor.avatar_url || undefined } : null,
            source: 'activity' as const,
            metadata: meta,
            channel: meta.channel || null,
            isAutomation: meta.is_automation || a.type.startsWith('automation_'),
          };
        });

      // Merge and sort chronologically (oldest first)
      return [...timelineMapped, ...activityMapped].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
    enabled: !!leadId,
    staleTime: 30_000,
  });
}
