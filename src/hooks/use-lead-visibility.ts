import { supabase } from '@/integrations/supabase/client';

/**
 * Interface que define o nível de visibilidade de leads para um usuário
 */
export interface LeadVisibility {
  /** true se pode ver TODOS os leads da organização (admin, super_admin, ou lead_view_all) */
  canViewAll: boolean;
  /** IDs dos membros das equipes lideradas (para supervisores/líderes) */
  teamMemberIds?: string[];
  /** ID do próprio usuário (quando só pode ver próprios leads) */
  userId?: string;
}

/**
 * Verifica o nível de visibilidade de leads para um usuário.
 * 
 * Níveis de visibilidade:
 * 1. canViewAll = true: Admins, super_admins, ou usuários com permissão lead_view_all
 * 2. teamMemberIds preenchido: Líderes de equipe que podem ver leads de todos os membros
 * 3. userId preenchido: Usuários normais que só podem ver seus próprios leads
 * 
 * @param userId - ID do usuário a verificar
 * @returns Promise<LeadVisibility> com as informações de visibilidade
 */
export async function checkLeadVisibility(userId: string): Promise<LeadVisibility> {
  // 1. Verificar role do usuário
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (userData?.role === 'admin' || userData?.role === 'super_admin') {
    return { canViewAll: true };
  }
  
  // 2. Verificar permissão lead_view_all
  const { data: hasViewAll } = await supabase.rpc('user_has_permission', {
    p_permission_key: 'lead_view_all',
    p_user_id: userId,
  });
  
  if (hasViewAll) {
    return { canViewAll: true };
  }
  
  // 3. Verificar se é líder de equipe
  const { data: isLeader } = await supabase.rpc('is_team_leader', { check_user_id: userId });
  
  if (isLeader) {
    // Buscar IDs de todas as equipes que lidera
    const { data: ledTeamIds } = await supabase.rpc('get_user_led_team_ids');
    
    if (ledTeamIds && ledTeamIds.length > 0) {
      // Buscar todos os membros dessas equipes
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', ledTeamIds);
      
      // Remover duplicados e incluir o próprio líder
      const memberIds = [...new Set([
        userId, // Incluir o próprio líder
        ...(members?.map(m => m.user_id) || [])
      ])];
      
      return { canViewAll: false, teamMemberIds: memberIds };
    }
  }
  
  // 4. Usuário normal - só vê próprios leads
  return { canViewAll: false, userId };
}

/**
 * Helper para aplicar filtro de visibilidade em uma query do Supabase.
 * 
 * @param query - Query do Supabase
 * @param visibility - Objeto de visibilidade retornado por checkLeadVisibility
 * @param userIdColumn - Nome da coluna que contém o ID do usuário responsável (default: 'assigned_user_id')
 * @param explicitUserId - ID de usuário explícito para filtrar (override da visibilidade)
 * @returns Query com filtro de visibilidade aplicado
 */
export function applyVisibilityFilter<T>(
  query: any,
  visibility: LeadVisibility,
  userIdColumn: string = 'assigned_user_id',
  explicitUserId?: string | null
): T {
  // Se foi passado um userId explícito, usar ele
  if (explicitUserId) {
    return query.eq(userIdColumn, explicitUserId);
  }
  
  // Se pode ver tudo, não aplicar filtro
  if (visibility.canViewAll) {
    return query;
  }
  
  // Se é líder de equipe, filtrar por membros da equipe
  if (visibility.teamMemberIds && visibility.teamMemberIds.length > 0) {
    return query.in(userIdColumn, visibility.teamMemberIds);
  }
  
  // Usuário normal - só próprios leads
  if (visibility.userId) {
    return query.eq(userIdColumn, visibility.userId);
  }
  
  // Fallback de segurança - não retornar nada
  return query.eq(userIdColumn, 'no-access');
}
