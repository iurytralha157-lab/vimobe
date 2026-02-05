# Plano de Correção: Auditoria do Dashboard

## ✅ Status: CONCLUÍDO

## Diagnóstico Completo

Após análise detalhada do código, identifiquei **inconsistências na lógica de visibilidade** entre o Dashboard e a Pipeline. O problema principal é que o Dashboard usa apenas `role === 'admin'` para determinar quem vê todos os dados, enquanto a Pipeline considera também `super_admin`, a permissão `lead_view_all` e líderes de equipe.

## Problemas Encontrados

### 1. Verificação de Permissões Incompleta (CRÍTICO)

**Localização**: `src/hooks/use-dashboard-stats.ts`

| Hook | Problema |
|------|----------|
| `useEnhancedDashboardStats` | Verifica apenas `role === 'admin'` |
| `useLeadsChartData` | Verifica apenas `role === 'admin'` |
| `useFunnelData` | Verifica apenas `role === 'admin'` |
| `useLeadSourcesData` | Verifica apenas `role === 'admin'` |
| `useUpcomingTasks` | Verifica apenas `role === 'admin'` |
| `useDealsEvolutionData` | Verifica apenas `role === 'admin'` |

**Consequência**: Usuários com permissão `lead_view_all` (ex: Backoffice) veem todos os leads na Pipeline, mas apenas os próprios no Dashboard.

### 2. Top Brokers sem Filtro de Visibilidade

**Localização**: `src/hooks/use-dashboard-stats.ts` (hook `useTopBrokers`)

O ranking de corretores mostra todos os corretores da organização, mesmo para usuários não-admin. Isso pode vazar informações de performance.

### 3. Filtros Visíveis para Usuários sem Permissão

**Localização**: `src/components/dashboard/DashboardFilters.tsx`

O filtro de "Corretor" aparece para todos, mas usuários sem `lead_view_all` não deveriam poder filtrar por outros corretores.

## O que está funcionando

- KPICards, Funil, Origens, Evolução: renderização OK
- Filtros de data e origem: funcionais
- Dashboard Telecom: lógica de visibilidade correta (usa `isAdmin || isSuperAdmin`)
- RPCs `get_funnel_data` e `get_lead_sources_data`: recebem userId corretamente

## Correções Propostas

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-dashboard-stats.ts` | Adicionar verificação de `super_admin` e `lead_view_all` em 6 hooks |
| `src/components/dashboard/DashboardFilters.tsx` | Ocultar filtro de Corretor para usuários sem permissão |
| (Opcional) `src/hooks/use-dashboard-stats.ts` | Ocultar TopBrokers para corretores |

### Detalhes Técnicos

**1. Criar função auxiliar para verificar visibilidade ampla**

```typescript
// Em use-dashboard-stats.ts
async function checkCanViewAllLeads(userId: string): Promise<boolean> {
  // Verificar role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (userData?.role === 'admin' || userData?.role === 'super_admin') {
    return true;
  }
  
  // Verificar permissão lead_view_all
  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_permission_key: 'lead_view_all',
    p_user_id: userId,
  });
  
  return !!hasPermission;
}
```

**2. Aplicar em todos os hooks afetados**

```typescript
// Substituir em cada hook:
// ANTES
const isAdmin = currentUserRole === 'admin';

// DEPOIS
const canViewAll = await checkCanViewAllLeads(currentUserId);
```

**3. Ajustar filtro de Corretor no frontend**

```typescript
// Em DashboardFilters.tsx
const { data: canViewAll = false } = useHasPermission('lead_view_all');
const showUserFilter = isAdmin || canViewAll;

// Só renderiza UserFilter se showUserFilter for true
{showUserFilter && <UserFilter />}
```

**4. Opcional: Ocultar TopBrokers para corretores**

Corretores veriam apenas sua própria posição, não o ranking completo. Isso protege informações de performance.

## Resultado Esperado

Após as correções:

| Cenário | Antes | Depois |
|---------|-------|--------|
| Backoffice (lead_view_all) | Vê só seus leads no Dashboard | Vê todos os leads |
| Super Admin | Vê só seus leads (não tinha `super_admin` check) | Vê todos os leads |
| Corretor comum | Vê filtro de Corretor | Não vê filtro de Corretor |
| Líder de equipe | Vê só seus leads | Vê leads da equipe |

## Correções Implementadas

1. ✅ **Corrigida verificação de permissões** em `src/hooks/use-dashboard-stats.ts`
   - Adicionada função `checkCanViewAllLeads()` que verifica `admin`, `super_admin` e `lead_view_all`
   - Aplicada em: `useEnhancedDashboardStats`, `useLeadsChartData`, `useFunnelData`, `useLeadSourcesData`, `useUpcomingTasks`, `useDealsEvolutionData`

2. ✅ **Filtro de Corretor ocultado** para usuários sem permissão em `src/components/dashboard/DashboardFilters.tsx`
   - Usa `useUserPermissions` para verificar `lead_view_all`
   - Também considera líderes de equipe

3. ✅ **TopBrokers protegido** - retorna array vazio para usuários sem permissão de visualização global
