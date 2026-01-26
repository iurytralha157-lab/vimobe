
# Plano: Correção Completa das Automações de Estágio do Pipeline

## Resumo do Problema

Ao mover um lead para uma coluna com automação configurada para "Alterar status para Perdido", o status **não está mudando**. Além disso, a notificação (toast) mostra apenas "Lead movido para [estágio]" ao invés de "Lead alterado para Perdido".

## Análise Técnica

### Problema 1: Configuração da Automação Não Está Sendo Salva

Ao verificar a automação no banco de dados:
```
action_config: NULL  (deveria ser {"deal_status": "lost"})
automation_type: change_deal_status_on_enter
```

O `action_config` está vazio porque há uma **desconexão de dados** entre o formulário e o hook:

| AutomationForm.tsx | use-stage-automations.ts |
|-------------------|-------------------------|
| Envia `action_config: {deal_status: "lost"}` | Espera receber `deal_status: "lost"` direto |

O formulário passa `action_config` já montado, mas o hook tenta reconstruir a partir de `data.deal_status` que chega como `undefined`.

### Problema 2: Notificação Não Reflete a Mudança de Status

O código em `Pipelines.tsx` sempre mostra:
```typescript
toast.success(`Lead movido para ${newStage?.name}`);
```

Mesmo quando uma automação altera o status do deal, o usuário não recebe feedback visual sobre isso.

---

## Plano de Implementação

### Etapa 1: Corrigir o Hook useCreateStageAutomation

**Arquivo:** `src/hooks/use-stage-automations.ts`

**Mudança:** Aceitar tanto `deal_status` direto quanto `action_config` já montado

```typescript
// Lógica atual (bugada):
if (data.automation_type === 'change_deal_status_on_enter' && data.deal_status) {
  actionConfig = { deal_status: data.deal_status };
}

// Nova lógica (correta):
if (data.automation_type === 'change_deal_status_on_enter') {
  // Priorizar action_config já montado, ou usar deal_status direto
  if (data.action_config && (data.action_config as any).deal_status) {
    actionConfig = data.action_config;
  } else if (data.deal_status) {
    actionConfig = { deal_status: data.deal_status };
  }
}
```

Também atualizar o tipo `CreateAutomationData` para incluir `action_config` opcional.

### Etapa 2: Sincronizar o AutomationForm

**Arquivo:** `src/components/automations/AutomationForm.tsx`

**Mudança:** Passar `deal_status` diretamente no objeto de dados ao invés de `action_config` pré-montado, alinhando com o que o hook espera.

```typescript
const data = {
  stage_id: stageId,
  automation_type: automationType,
  // Passar valores diretos ao invés de action_config
  deal_status: automationType === 'change_deal_status_on_enter' ? dealStatus : undefined,
  target_user_id: automationType === 'change_assignee_on_enter' ? targetUserId : undefined,
  // ... demais campos
};
```

### Etapa 3: Melhorar Feedback Visual (Toast Dinâmico)

**Arquivo:** `src/pages/Pipelines.tsx`

**Mudança:** Após mover o lead, verificar se há automações ativas no estágio de destino e mostrar toast mais informativo.

```typescript
// Buscar automações do estágio de destino
const { data: stageAutomations } = await supabase
  .from('stage_automations')
  .select('automation_type, action_config')
  .eq('stage_id', newStageId)
  .eq('is_active', true);

// Verificar se há automação de status
const statusAutomation = stageAutomations?.find(
  a => a.automation_type === 'change_deal_status_on_enter'
);

if (statusAutomation?.action_config?.deal_status) {
  const statusLabel = {
    won: 'Ganho',
    lost: 'Perdido', 
    open: 'Aberto'
  }[statusAutomation.action_config.deal_status];
  
  toast.success(`Lead alterado para ${statusLabel}`, {
    description: `Movido para ${newStage?.name}`
  });
} else {
  toast.success(`Lead movido para ${newStage?.name}`);
}
```

### Etapa 4: Limpar Automações Corrompidas no Banco

**Ação:** Migração SQL para deletar automações com `action_config` vazio que deveriam ter configuração:

```sql
DELETE FROM public.stage_automations
WHERE automation_type IN ('change_deal_status_on_enter', 'change_assignee_on_enter')
  AND (action_config IS NULL OR action_config = '{}'::jsonb OR action_config = 'null'::jsonb);
```

---

## Arquivos a Serem Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/use-stage-automations.ts` | Corrigir lógica de construção do action_config |
| `src/components/automations/AutomationForm.tsx` | Passar deal_status/target_user_id direto |
| `src/pages/Pipelines.tsx` | Toast dinâmico baseado na automação |
| Migração SQL | Limpar automações corrompidas |

---

## Resultado Esperado

1. Ao criar automação "Alterar status para Perdido", o `action_config` será salvo corretamente como `{"deal_status": "lost"}`
2. Ao mover lead para a coluna, o trigger do banco aplicará o status automaticamente
3. O toast mostrará: **"Lead alterado para Perdido"** com descrição "Movido para [nome do estágio]"
4. O histórico do lead terá a atividade: "Status alterado automaticamente para Perdido (automação)"
