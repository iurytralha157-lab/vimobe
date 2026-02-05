
# Plano: Corrigir Visibilidade do Dashboard para Supervisores/Líderes de Equipe

## Problema Identificado
O supervisor (Paulo) consegue ver leads na pipeline porque a RLS permite via `get_user_led_pipeline_ids()`, mas o Dashboard mostra tudo zerado porque os hooks de dados usam `checkCanViewAllLeads()` que **não considera líderes de equipe**.

### Fluxo Atual (Quebrado)
```
Supervisor → checkCanViewAllLeads() → FALSE (não é admin, não tem lead_view_all)
→ Busca apenas leads atribuídos a ele mesmo → Dashboard vazio
```

### Fluxo Correto
```
Supervisor → checkCanViewTeamLeads() → TRUE (é líder de equipe)
→ Busca leads de todos os membros de suas equipes → Dashboard mostra dados da equipe
```

---

## Solução Proposta

### 1. Criar Nova Função Helper: `checkLeadVisibility`

**Arquivo:** `src/hooks/use-dashboard-stats.ts`

Substituir `checkCanViewAllLeads` por uma função mais completa que retorna:
- `{ canViewAll: true }` para admins/super_admins ou quem tem `lead_view_all`
- `{ canViewAll: false, teamMemberIds: [...] }` para líderes de equipe
- `{ canViewAll: false, userId: 'xxx' }` para usuários normais

```typescript
interface LeadVisibility {
  canViewAll: boolean;
  teamMemberIds?: string[]; // IDs dos membros das equipes lideradas
  userId?: string; // ID do próprio usuário (quando não pode ver nada além)
}

async function checkLeadVisibility(userId: string): Promise<LeadVisibility> {
  // 1. Verificar role
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
    // Buscar IDs de todos os membros das equipes que lidera
    const { data: ledTeamIds } = await supabase.rpc('get_user_led_team_ids');
    
    if (ledTeamIds && ledTeamIds.length > 0) {
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', ledTeamIds);
      
      const memberIds = [...new Set(members?.map(m => m.user_id) || [])];
      return { canViewAll: false, teamMemberIds: memberIds };
    }
  }
  
  // 4. Usuário normal - só vê próprios leads
  return { canViewAll: false, userId };
}
```

### 2. Atualizar Hooks de Dashboard

**Hooks a modificar:**
- `useEnhancedDashboardStats` 
- `useFunnelData`
- `useLeadSourcesData`
- `useTopBrokers`
- `useDealsEvolutionData`
- `useUpcomingTasks`

Para cada hook, substituir a lógica:

```typescript
// ANTES
const canViewAll = await checkCanViewAllLeads(userId);
if (!canViewAll && userId) {
  query = query.eq('assigned_user_id', userId);
}

// DEPOIS
const visibility = await checkLeadVisibility(userId);
if (!visibility.canViewAll) {
  if (visibility.teamMemberIds) {
    // Líder de equipe: ver leads de todos os membros
    query = query.in('assigned_user_id', visibility.teamMemberIds);
  } else if (visibility.userId) {
    // Usuário normal: só próprios leads
    query = query.eq('assigned_user_id', visibility.userId);
  }
}
```

### 3. Atualizar Hooks do Telecom

**Arquivo:** `src/hooks/use-telecom-dashboard-stats.ts`

Aplicar a mesma lógica de visibilidade para:
- `useTelecomDashboardStats`
- `useTelecomEvolutionData`

Substituir a verificação simples `isAdmin` por `checkLeadVisibility` que considera líderes de equipe.

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/use-dashboard-stats.ts` | Criar `checkLeadVisibility`, atualizar todos os hooks |
| `src/hooks/use-telecom-dashboard-stats.ts` | Importar e usar `checkLeadVisibility` |

### Fluxo de Dados Após Correção

```
┌─────────────────────────────────────────────────────────────────┐
│                      checkLeadVisibility()                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Admin/SuperAdmin ──► canViewAll: true ──► Vê todos os dados    │
│                                                                  │
│  lead_view_all ──────► canViewAll: true ──► Vê todos os dados   │
│                                                                  │
│  Líder de Equipe ────► teamMemberIds ───► Vê dados da equipe    │
│                                                                  │
│  Usuário Normal ─────► userId ──────────► Vê só próprios dados  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. **Supervisor Paulo** verá no dashboard:
   - KPIs agregados de todos os leads da sua equipe
   - Funil de vendas com leads da equipe
   - Origens de leads da equipe
   - Evolução de clientes da equipe
   - Top corretores (apenas da sua equipe)

2. **Administrador** continua vendo todos os dados

3. **Corretor comum** continua vendo apenas seus próprios dados

---

## Considerações de Performance

A função `checkLeadVisibility` faz até 4 queries adicionais para líderes:
1. Buscar role do usuário
2. Verificar permissão `lead_view_all`
3. Verificar se é líder (`is_team_leader`)
4. Buscar IDs dos membros das equipes

Para otimizar, o resultado pode ser cacheado na queryKey do React Query, evitando refetch desnecessário.
