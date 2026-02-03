import { supabase } from '@/integrations/supabase/client';

interface NotifyLeadCreatedParams {
  leadId: string;
  leadName: string;
  organizationId: string;
  pipelineId?: string | null;
  assignedUserId?: string | null;
  source?: string;
}

/**
 * Notifica todas as partes interessadas quando um lead é criado:
 * 1. Vendedor atribuído (assigned_user_id)
 * 2. Líderes das equipes vinculadas à pipeline
 * 3. Administradores da organização
 * 
 * Evita notificações duplicadas usando um Set de IDs já notificados.
 */
export async function notifyLeadCreated({
  leadId,
  leadName,
  organizationId,
  pipelineId,
  assignedUserId,
  source = 'manual',
}: NotifyLeadCreatedParams): Promise<void> {
  const notifiedUserIds = new Set<string>();
  const notifications: {
    user_id: string;
    organization_id: string;
    lead_id: string;
    title: string;
    content: string;
    type: string;
  }[] = [];

  const sourceLabel = getSourceLabel(source);

  // 1. Notificar o vendedor atribuído
  if (assignedUserId) {
    notifiedUserIds.add(assignedUserId);
    notifications.push({
      user_id: assignedUserId,
      organization_id: organizationId,
      lead_id: leadId,
      title: '🆕 Novo lead atribuído a você!',
      content: `${leadName} foi atribuído a você (origem: ${sourceLabel})`,
      type: 'lead',
    });
  }

  // 2. Buscar líderes das equipes vinculadas à pipeline
  if (pipelineId) {
    try {
      // Buscar equipes vinculadas à pipeline
      const { data: teamPipelines } = await supabase
        .from('team_pipelines')
        .select('team_id')
        .eq('pipeline_id', pipelineId);

      if (teamPipelines && teamPipelines.length > 0) {
        const teamIds = teamPipelines.map(tp => tp.team_id);

        // Buscar líderes dessas equipes
        const { data: leaders } = await supabase
          .from('team_members')
          .select('user_id')
          .in('team_id', teamIds)
          .eq('is_leader', true);

        if (leaders) {
          for (const leader of leaders) {
            if (!notifiedUserIds.has(leader.user_id)) {
              notifiedUserIds.add(leader.user_id);
              notifications.push({
                user_id: leader.user_id,
                organization_id: organizationId,
                lead_id: leadId,
                title: '🆕 Novo lead na sua equipe!',
                content: `${leadName} entrou na pipeline da sua equipe (origem: ${sourceLabel})`,
                type: 'lead',
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar líderes de equipe:', error);
    }
  }

  // 3. Notificar administradores da organização
  try {
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (admins) {
      for (const admin of admins) {
        if (!notifiedUserIds.has(admin.id)) {
          notifiedUserIds.add(admin.id);
          notifications.push({
            user_id: admin.id,
            organization_id: organizationId,
            lead_id: leadId,
            title: '🆕 Novo lead criado',
            content: `${leadName} foi criado na organização (origem: ${sourceLabel})`,
            type: 'lead',
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar administradores:', error);
  }

  // Inserir todas as notificações de uma vez
  if (notifications.length > 0) {
    try {
      await supabase.from('notifications').insert(notifications);
      console.log(`✅ ${notifications.length} notificações criadas para lead ${leadId}`);
    } catch (error) {
      console.error('Erro ao criar notificações:', error);
    }
  }
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    manual: 'Manual',
    website: 'Site',
    whatsapp: 'WhatsApp',
    meta: 'Meta Ads',
    facebook: 'Facebook',
    instagram: 'Instagram',
    wordpress: 'WordPress',
    api: 'API',
    import: 'Importação',
  };
  return labels[source] || source;
}
