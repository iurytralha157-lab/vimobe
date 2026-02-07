

## Script de Limpeza Automática de Membros Inválidos

### Problema Identificado

Usuários "órfãos" (com `organization_id = NULL`) continuam como membros de equipes e filas de distribuição, causando:
- Leads sendo atribuídos a usuários invisíveis
- Avatares "?" nas listagens de equipes
- Falhas na distribuição do Round Robin

**Usuários órfãos encontrados:**
- Maikson (maiamaikson29@gmail.com)
- Vetter Co. (companyvetter@gmail.com)

---

### Solução Proposta

Criar uma Edge Function `cleanup-orphan-members` que:
1. Identifica membros órfãos em `team_members` e `round_robin_members`
2. Remove automaticamente esses registros
3. Registra as ações em log
4. Pode ser executada manualmente ou via cron

---

### Arquitetura

```text
┌─────────────────────────────────────────────────────────┐
│                cleanup-orphan-members                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Buscar membros de equipe com user_id inválido      │
│     → user deletado OU organization_id NULL            │
│     → organization diferente da equipe                 │
│                                                         │
│  2. Buscar membros de round-robin com user_id inválido │
│     → mesmas condições                                  │
│                                                         │
│  3. Deletar registros órfãos                           │
│                                                         │
│  4. Retornar relatório de limpeza                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Arquivos a Criar/Editar

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| **CRIAR** | `supabase/functions/cleanup-orphan-members/index.ts` | Edge Function de limpeza |
| **EDITAR** | `supabase/config.toml` | Registrar nova função |
| **EDITAR** | `src/pages/admin/AdminDatabase.tsx` | Adicionar botão de limpeza manual |
| **CRIAR** | `src/hooks/use-cleanup-orphans.ts` | Hook para chamar a função |

---

### Implementação Detalhada

#### 1. Edge Function (`cleanup-orphan-members`)

```typescript
// Lógica principal
async function cleanupOrphanMembers(supabase) {
  const results = {
    team_members_removed: [],
    round_robin_members_removed: [],
  };

  // 1. Buscar membros de equipe órfãos
  const orphanTeamMembers = await supabase.rpc('find_orphan_team_members');
  
  // 2. Deletar cada membro órfão
  for (const member of orphanTeamMembers) {
    await supabase
      .from('team_members')
      .delete()
      .eq('id', member.id);
    results.team_members_removed.push(member);
  }

  // 3. Buscar membros de round-robin órfãos
  const orphanRRMembers = await supabase.rpc('find_orphan_rr_members');
  
  // 4. Deletar cada membro órfão
  for (const member of orphanRRMembers) {
    await supabase
      .from('round_robin_members')
      .delete()
      .eq('id', member.id);
    results.round_robin_members_removed.push(member);
  }

  return results;
}
```

#### 2. RPC Functions no Banco

Criar duas funções SQL para identificar membros órfãos:

```sql
-- Encontrar membros de equipe órfãos
CREATE OR REPLACE FUNCTION find_orphan_team_members()
RETURNS TABLE (
  member_id uuid,
  team_id uuid,
  user_id uuid,
  team_name text,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id,
    tm.team_id,
    tm.user_id,
    t.name,
    CASE 
      WHEN u.id IS NULL THEN 'user_deleted'
      WHEN u.organization_id IS NULL THEN 'user_no_org'
      WHEN u.organization_id != t.organization_id THEN 'org_mismatch'
    END
  FROM team_members tm
  JOIN teams t ON tm.team_id = t.id
  LEFT JOIN users u ON tm.user_id = u.id
  WHERE u.id IS NULL 
     OR u.organization_id IS NULL 
     OR u.organization_id != t.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Encontrar membros de round-robin órfãos
CREATE OR REPLACE FUNCTION find_orphan_rr_members()
RETURNS TABLE (
  member_id uuid,
  round_robin_id uuid,
  user_id uuid,
  queue_name text,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rrm.id,
    rrm.round_robin_id,
    rrm.user_id,
    rr.name,
    CASE 
      WHEN u.id IS NULL THEN 'user_deleted'
      WHEN u.organization_id IS NULL THEN 'user_no_org'
      WHEN u.organization_id != rr.organization_id THEN 'org_mismatch'
    END
  FROM round_robin_members rrm
  JOIN round_robins rr ON rrm.round_robin_id = rr.id
  LEFT JOIN users u ON rrm.user_id = u.id
  WHERE u.id IS NULL 
     OR u.organization_id IS NULL 
     OR u.organization_id != rr.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. UI no Admin Database

Adicionar seção "Manutenção" com:
- Card mostrando quantidade de membros órfãos detectados
- Botão "Executar Limpeza" que chama a Edge Function
- Histórico das últimas limpezas (opcional)

---

### Validação Preventiva

Além da limpeza, adicionar validação nos hooks para evitar novos órfãos:

#### `use-teams.ts` - Filtrar usuários válidos

```typescript
// Ao buscar usuários para seleção, filtrar apenas os da organização
const { data: users } = await supabase
  .from('users')
  .select('id, name')
  .eq('organization_id', currentOrgId)
  .not('organization_id', 'is', null);
```

#### `use-round-robins.ts` - Validar ao adicionar membro

```typescript
// Antes de inserir, verificar se usuário pertence à organização
const { data: user } = await supabase
  .from('users')
  .select('organization_id')
  .eq('id', userId)
  .single();

if (!user?.organization_id || user.organization_id !== rrOrgId) {
  throw new Error('Usuário não pertence a esta organização');
}
```

---

### Opções de Execução

| Modo | Frequência | Uso |
|------|------------|-----|
| **Manual** | Sob demanda | Botão no Admin Dashboard |
| **Cron** | Diário às 3h | Limpeza automática preventiva |

Para cron (opcional):
```sql
SELECT cron.schedule(
  'cleanup-orphans-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://<project>.supabase.co/functions/v1/cleanup-orphan-members',
    headers:='{"Authorization": "Bearer <anon_key>"}'::jsonb
  );
  $$
);
```

---

### Fluxo do Usuário

1. Super Admin acessa `/admin/database`
2. Vê card "Membros Órfãos" com contagem
3. Clica em "Executar Limpeza"
4. Sistema remove membros inválidos
5. Toast mostra resultado: "3 membros removidos de equipes, 2 de filas"

---

### Seção Técnica

#### Migração SQL

```sql
-- Funções para encontrar órfãos
CREATE OR REPLACE FUNCTION public.find_orphan_team_members()...
CREATE OR REPLACE FUNCTION public.find_orphan_rr_members()...

-- Função para executar limpeza (usada pela Edge Function)
CREATE OR REPLACE FUNCTION public.cleanup_orphan_members()
RETURNS jsonb AS $$
DECLARE
  team_count int;
  rr_count int;
BEGIN
  -- Deletar membros de equipe órfãos
  WITH deleted AS (
    DELETE FROM team_members tm
    USING teams t, users u
    WHERE tm.team_id = t.id
      AND tm.user_id = u.id
      AND (u.organization_id IS NULL OR u.organization_id != t.organization_id)
    RETURNING tm.id
  )
  SELECT count(*) INTO team_count FROM deleted;

  -- Deletar de equipes onde usuário não existe mais
  DELETE FROM team_members 
  WHERE user_id NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS team_count = team_count + ROW_COUNT;

  -- Deletar membros de round-robin órfãos
  WITH deleted AS (
    DELETE FROM round_robin_members rrm
    USING round_robins rr, users u
    WHERE rrm.round_robin_id = rr.id
      AND rrm.user_id = u.id
      AND (u.organization_id IS NULL OR u.organization_id != rr.organization_id)
    RETURNING rrm.id
  )
  SELECT count(*) INTO rr_count FROM deleted;

  -- Deletar de round-robins onde usuário não existe mais
  DELETE FROM round_robin_members 
  WHERE user_id NOT IN (SELECT id FROM users);
  GET DIAGNOSTICS rr_count = rr_count + ROW_COUNT;

  RETURN jsonb_build_object(
    'team_members_removed', team_count,
    'round_robin_members_removed', rr_count,
    'executed_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Hook `use-cleanup-orphans.ts`

```typescript
export function useOrphanStats() {
  return useQuery({
    queryKey: ['orphan-stats'],
    queryFn: async () => {
      const { data: teamOrphans } = await supabase.rpc('find_orphan_team_members');
      const { data: rrOrphans } = await supabase.rpc('find_orphan_rr_members');
      return {
        teamOrphans: teamOrphans || [],
        rrOrphans: rrOrphans || [],
        total: (teamOrphans?.length || 0) + (rrOrphans?.length || 0),
      };
    },
  });
}

export function useCleanupOrphans() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cleanup-orphan-members');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orphan-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['round-robins'] });
      toast.success(`Limpeza concluída: ${data.team_members_removed} de equipes, ${data.round_robin_members_removed} de filas`);
    },
  });
}
```

---

### Benefícios

1. **Imediato**: Remove o Maikson e outros órfãos das filas
2. **Preventivo**: Validação impede novos órfãos
3. **Transparente**: Super Admin vê e controla a limpeza
4. **Automatizável**: Pode rodar via cron diariamente

