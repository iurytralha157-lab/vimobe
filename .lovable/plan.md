

# Diagnóstico e Correção: Pipeline e Automações de Estágio

## Problemas Identificados

### Problema 1: Automações com `action_config` NULL
Encontrei automações ativas no banco de dados que estão **mal configuradas**:

```
id: ffba0b1b-f0da-4dbb-addd-1b02df6ffe17
stage_name: Perdido
automation_type: change_deal_status_on_enter
action_config: NULL  ← PROBLEMA! Deveria ter {"deal_status": "lost"}
```

A função do banco **pula essas automações** porque verifica:
```sql
IF v_automation.automation_type IN ('change_deal_status_on_enter', ...)
   AND (v_action_config IS NULL OR v_action_config = '{}'::jsonb) THEN
  CONTINUE; -- Skip this automation, it's misconfigured
```

**Causa raiz**: O formulário de automação salva corretamente, mas algumas automações antigas foram criadas antes da correção do hook.

### Problema 2: Trigger BEFORE vs UI otimista
O trigger `execute_stage_automations` roda como **BEFORE UPDATE**, ou seja, ele modifica o `NEW.deal_status` antes de salvar. Porém, o frontend faz **atualização otimista** do cache e não sabe que o status mudou.

O código atual no `handleDragEnd`:
```typescript
// Optimistic update - NÃO inclui deal_status atualizado
const updatedLead = {
  ...movedLead,
  stage_id: newStageId,
  stage_entered_at: new Date().toISOString(),
  // ❌ Falta: deal_status não é atualizado aqui!
};
```

Depois ele mostra um toast dizendo "Lead alterado para Perdido", mas o card continua mostrando "Aberto" até o refetch.

### Problema 3: Falta de refetch imediato após mudança de status
Após mover o lead, o código busca as automações e mostra toast, mas **não força refetch** para atualizar a UI com o novo status.

---

## Solução Proposta

### Correção 1: Atualizar `action_config` das automações mal configuradas
Executar SQL para corrigir as automações existentes com `action_config` NULL:

```sql
-- Corrigir automações de status sem action_config
UPDATE stage_automations
SET action_config = jsonb_build_object('deal_status', 'lost')
WHERE automation_type = 'change_deal_status_on_enter'
  AND (action_config IS NULL OR action_config = '{}')
  AND stage_id IN (SELECT id FROM stages WHERE LOWER(name) LIKE '%perdido%');

UPDATE stage_automations
SET action_config = jsonb_build_object('deal_status', 'won')
WHERE automation_type = 'change_deal_status_on_enter'
  AND (action_config IS NULL OR action_config = '{}')
  AND stage_id IN (SELECT id FROM stages WHERE LOWER(name) LIKE '%ganho%' OR LOWER(name) LIKE '%fechado%');
```

### Correção 2: Melhorar `handleDragEnd` em Pipelines.tsx
1. **Verificar automações ANTES** de fazer update otimista
2. **Incluir deal_status na atualização otimista** se houver automação
3. **Forçar refetch** após o update para garantir sincronização

### Correção 3: Adicionar validação no frontend
No `AutomationForm.tsx`, garantir que `deal_status` sempre seja enviado quando o tipo é `change_deal_status_on_enter`.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Pipelines.tsx` | Atualizar `handleDragEnd` para aplicar deal_status no update otimista e forçar refetch |
| SQL Migration | Corrigir automações existentes com action_config NULL |

---

## Código das Correções

### 1. Pipelines.tsx - handleDragEnd melhorado

```typescript
const handleDragEnd = useCallback(async (result: DropResult) => {
  const { destination, source, draggableId } = result;
  
  if (!destination) return;
  if (destination.droppableId === source.droppableId && destination.index === source.index) return;
  
  const newStageId = destination.droppableId;
  const oldStageId = source.droppableId;
  const oldStage = stages.find(s => s.id === oldStageId);
  const newStage = stages.find(s => s.id === newStageId);
  
  // 🔥 NOVO: Verificar automações ANTES de fazer update otimista
  const { data: stageAutomations } = await supabase
    .from('stage_automations')
    .select('automation_type, action_config')
    .eq('stage_id', newStageId)
    .eq('is_active', true);
  
  const statusAutomation = stageAutomations?.find(
    (a: any) => a.automation_type === 'change_deal_status_on_enter'
  );
  const actionConfig = statusAutomation?.action_config as Record<string, unknown> | null;
  const newDealStatus = actionConfig?.deal_status as string | undefined;
  
  // Optimistic update - AGORA inclui deal_status se houver automação
  const queryKey = ['stages-with-leads', selectedPipelineId];
  const previousData = queryClient.getQueryData(queryKey);
  
  queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
    if (!old) return old;
    
    const sourceStageIndex = old.findIndex(s => s.id === oldStageId);
    const destStageIndex = old.findIndex(s => s.id === newStageId);
    
    if (sourceStageIndex === -1 || destStageIndex === -1) return old;
    
    const newStages = old.map(stage => ({
      ...stage,
      leads: [...(stage.leads || [])],
    }));
    
    const leadIndex = newStages[sourceStageIndex].leads.findIndex((l: any) => l.id === draggableId);
    if (leadIndex === -1) return old;
    
    const [movedLead] = newStages[sourceStageIndex].leads.splice(leadIndex, 1);
    
    // 🔥 NOVO: Incluir deal_status e timestamps no update otimista
    const updatedLead = {
      ...movedLead,
      stage_id: newStageId,
      stage_entered_at: new Date().toISOString(),
      stage: newStages[destStageIndex],
      // Aplicar deal_status se houver automação
      ...(newDealStatus && {
        deal_status: newDealStatus,
        won_at: newDealStatus === 'won' ? new Date().toISOString() : null,
        lost_at: newDealStatus === 'lost' ? new Date().toISOString() : null,
      }),
    };
    
    newStages[destStageIndex].leads.splice(destination.index, 0, updatedLead);
    
    return newStages;
  });
  
  try {
    const { error } = await supabase
      .from('leads')
      .update({ 
        stage_id: newStageId,
        stage_entered_at: new Date().toISOString(),
      })
      .eq('id', draggableId);
    
    if (error) throw error;
    
    // Log activity...
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('activities').insert({
      lead_id: draggableId,
      type: 'stage_change',
      content: `Movido de "${oldStage?.name}" para "${newStage?.name}"`,
      user_id: userData.user?.id,
      metadata: {
        from_stage: oldStage?.name,
        to_stage: newStage?.name,
        from_stage_id: oldStageId,
        to_stage_id: newStageId,
      },
    });
    
    // Toast e refetch
    if (newDealStatus) {
      const statusLabels: Record<string, string> = {
        won: 'Ganho',
        lost: 'Perdido',
        open: 'Aberto'
      };
      toast.success(`Lead alterado para ${statusLabels[newDealStatus] || newDealStatus}`, {
        description: `Movido para ${newStage?.name}`
      });
    } else {
      toast.success(`Lead movido para ${newStage?.name}`);
    }
    
    // 🔥 NOVO: Forçar refetch para garantir sincronização com banco
    // Isso é necessário porque o trigger pode ter alterado outros campos
    await refetch();
    
  } catch (error: any) {
    queryClient.setQueryData(queryKey, previousData);
    toast.error('Erro ao mover lead: ' + error.message);
  }
}, [stages, selectedPipelineId, queryClient, refetch]);
```

### 2. SQL Migration - Corrigir automações existentes

```sql
-- Corrigir automações change_deal_status_on_enter que estão sem action_config
-- Inferir o status baseado no nome do estágio

-- Automações de "Perdido" sem config
UPDATE stage_automations sa
SET action_config = '{"deal_status": "lost"}'::jsonb
FROM stages s
WHERE sa.stage_id = s.id
  AND sa.automation_type = 'change_deal_status_on_enter'
  AND (sa.action_config IS NULL OR sa.action_config = '{}')
  AND (LOWER(s.name) LIKE '%perdido%' OR LOWER(s.name) LIKE '%lost%');

-- Automações de "Ganho/Fechado" sem config  
UPDATE stage_automations sa
SET action_config = '{"deal_status": "won"}'::jsonb
FROM stages s
WHERE sa.stage_id = s.id
  AND sa.automation_type = 'change_deal_status_on_enter'
  AND (sa.action_config IS NULL OR sa.action_config = '{}')
  AND (LOWER(s.name) LIKE '%ganho%' OR LOWER(s.name) LIKE '%won%' OR LOWER(s.name) LIKE '%fechado%' OR LOWER(s.name) LIKE '%closed%');
```

---

## Resumo do que será feito

1. **Migração SQL**: Corrigir automações existentes com `action_config` NULL
2. **Pipelines.tsx**: 
   - Buscar automações ANTES do update otimista
   - Aplicar `deal_status` no cache imediatamente
   - Forçar refetch após sucesso
3. **Resultado**: Quando arrastar lead para "Perdido", ele vai:
   - Mudar visualmente para "Perdido" instantaneamente
   - Mostrar toast "Lead alterado para Perdido"
   - Sincronizar com banco de dados

