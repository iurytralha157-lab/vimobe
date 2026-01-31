

# Plano: Ajustar Histórico do Lead e Garantir Responsável

## Resumo do Pedido

1. **Remover "Atividades recentes"** da aba Atividades (deixar só "Próximas atividades")
2. **Melhorar o Histórico** com cronologia clara e labels mais descritivas:
   - "Lead criado via webhook X" (origem)
   - "Distribuído por [Fila] → [Responsável]" (em vez de "Responsável alterado")
   - "Lead reentrou via [fonte]"
   - "Redistribuído por [Fila] → [Novo Responsável]" (se aplicável)
3. **Garantir que leads nunca fiquem sem responsável** após reentrada
4. **Adicionar configuração de redistribuição em reentrada** nas filas de distribuição

---

## Diagnóstico do Problema

### Cronologia Atual (Invertida)
Olhando os dados do lead, a sequência está assim:
```
- Responsável alterado → Raquel (18:55:24) ← Round-robin distribuiu
- Lead criado via webhook (18:55:25) ← Activity criada DEPOIS
- Responsável removido (19:01:54) ← Reentrada limpou
- Lead reentrou (19:01:55) ← Activity criada DEPOIS
```

**Problema**: O trigger do round-robin atribui ANTES do webhook registrar a activity de criação, causando ordem invertida.

### Lead Sem Responsável
Quando o lead reentrou, o webhook setou `assigned_user_id = NULL` para forçar redistribuição, MAS a redistribuição não aconteceu porque não há trigger automático para chamar `handle_lead_intake` após o UPDATE.

---

## Arquitetura da Solução

### Parte 1: Ajustar Aba de Atividades

Remover a seção "Atividades recentes" do `LeadDetailDialog.tsx` (linhas 1639-1690 no desktop, linhas 717-758 no mobile).

**Resultado**: A aba "Atividades" mostrará apenas "Próximas atividades" (cadência).

---

### Parte 2: Melhorar Labels do Histórico

Atualizar `use-lead-full-history.ts` para gerar labels mais descritivas:

| Tipo | Label Atual | Label Nova |
|------|-------------|------------|
| `lead_created` | "Lead criado" | "Lead criado via [fonte/webhook_name]" |
| `assignee_changed` (primeira) | "Responsável alterado" | "Distribuído por [fila] → [responsável]" |
| `assignee_changed` (redistribuição) | "Responsável alterado" | "Redistribuído por [fila] → [responsável]" |
| `assignee_changed` (remoção) | "Responsável alterado" | "Responsável removido" |
| `lead_reentry` | "Lead reentrou" | "Lead reentrou via [fonte]" |

A lógica vai usar os metadados já existentes para gerar as labels:
- `metadata.webhook_name` para o nome do webhook
- `metadata.from_user_name` / `metadata.to_user_name` para responsáveis
- Consultar `assignments_log` para obter o nome da fila de distribuição

---

### Parte 3: Garantir Redistribuição Automática em Reentrada

O problema é que `generic-webhook` seta `assigned_user_id = NULL` mas NÃO chama `handle_lead_intake` diretamente. O trigger `trigger_lead_intake` existe mas precisa ser verificado.

**Solução**: Modificar `generic-webhook/index.ts` para chamar a RPC diretamente após limpar o responsável:

```typescript
// Após atualizar o lead (linha 180-183)
const { error: updateError } = await supabase
  .from('leads')
  .update(updateData)
  .eq('id', existingLead.id);

// NOVO: Chamar redistribuição imediatamente
const { data: redistributionResult } = await supabase
  .rpc('handle_lead_intake', { p_lead_id: existingLead.id });

if (redistributionResult?.assigned_user_id) {
  console.log(`Lead redistributed to: ${redistributionResult.assigned_user_id}`);
} else {
  // Se não conseguiu redistribuir, manter o responsável anterior
  await supabase
    .from('leads')
    .update({ assigned_user_id: oldAssigneeId })
    .eq('id', existingLead.id);
  console.log('No redistribution available, keeping original assignee');
}
```

---

### Parte 4: Configuração de Redistribuição em Reentrada

Adicionar configuração na fila de distribuição para controlar comportamento de reentrada:

**Novo campo na tabela `round_robins`**:
```sql
ALTER TABLE round_robins 
ADD COLUMN IF NOT EXISTS reentry_behavior TEXT DEFAULT 'redistribute';
-- Valores: 'redistribute' | 'keep_assignee'

COMMENT ON COLUMN round_robins.reentry_behavior IS 
  'Comportamento quando lead reentrar: redistribute (nova distribuição) ou keep_assignee (mantém responsável atual)';
```

**UI em DistributionTab**: Adicionar toggle "Quando lead reentrar" com opções:
- ✅ Redistribuir pela fila (padrão)
- ➡️ Manter responsável atual

---

### Parte 5: Melhorar Registros de Activity com Nome da Fila

Modificar a RPC `handle_lead_intake` para registrar uma activity com o nome da fila:

```sql
-- Dentro de handle_lead_intake, após atribuir o lead:
INSERT INTO activities (lead_id, type, content, user_id, metadata)
VALUES (
  p_lead_id,
  'assignee_changed',
  'Distribuído por "' || v_queue.name || '" para ' || v_member.user_name,
  v_assigned_user_id,
  jsonb_build_object(
    'distribution_queue_id', v_round_robin_id,
    'distribution_queue_name', v_queue.name,
    'from_user_id', NULL,
    'to_user_id', v_assigned_user_id,
    'to_user_name', v_member.user_name,
    'is_initial_distribution', true
  )
);
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/leads/LeadDetailDialog.tsx` | Remover seção "Atividades recentes" (desktop e mobile) |
| `src/hooks/use-lead-full-history.ts` | Melhorar labels baseado nos metadados |
| `supabase/functions/generic-webhook/index.ts` | Chamar redistribuição e manter responsável se falhar |
| **Migration SQL** | Adicionar `reentry_behavior` na tabela `round_robins` |
| **Migration SQL** | Atualizar RPC `handle_lead_intake` para registrar activity com nome da fila |
| `src/components/crm-management/DistributionTab.tsx` | Adicionar toggle de comportamento em reentrada |

---

## Fluxo Esperado Após Implementação

### Cenário: Lead novo via webhook

```
1. Webhook recebe lead
2. Activity: "Lead criado via webhook Make"
3. handle_lead_intake chamado
4. Activity: "Distribuído por Fila Vendas → Raquel Fernandes"
```

### Cenário: Lead reentrou (config: redistribuir)

```
1. Webhook detecta telefone existente
2. Activity: "Lead reentrou via webhook Make"
3. handle_lead_intake chamado
4. Activity: "Redistribuído por Fila Vendas → João Silva"
```

### Cenário: Lead reentrou (config: manter responsável)

```
1. Webhook detecta telefone existente
2. Activity: "Lead reentrou via webhook Make"
3. Activity: "Lead continua com Raquel Fernandes (configuração da fila)"
```

---

## Cronologia Correta no Histórico

Após as mudanças, o histórico mostrará (do mais recente para o mais antigo):

```
📦 Redistribuído por "Fila Vendas" → João Silva     há 2 min
🔄 Lead reentrou via webhook "Make"                 há 2 min
─────────────────────────────────────────────────────
📦 Distribuído por "Fila Vendas" → Raquel Fernandes há 15 min
✨ Lead criado via webhook "Make"                   há 15 min
```

---

## Detalhes Técnicos

### Labels Dinâmicas em use-lead-full-history.ts

```typescript
function getActivityLabel(activity: Activity): string {
  const meta = activity.metadata as Record<string, any> || {};
  
  switch (activity.type) {
    case 'lead_created':
      if (meta.webhook_name) {
        return `Lead criado via webhook "${meta.webhook_name}"`;
      }
      return `Lead criado via ${meta.source || 'manual'}`;
      
    case 'assignee_changed':
      if (meta.distribution_queue_name && meta.to_user_name) {
        const prefix = meta.is_initial_distribution ? 'Distribuído' : 'Redistribuído';
        return `${prefix} por "${meta.distribution_queue_name}" → ${meta.to_user_name}`;
      }
      if (!meta.to_user_id) {
        return 'Responsável removido';
      }
      return `Atribuído a ${meta.to_user_name || 'usuário'}`;
      
    case 'lead_reentry':
      return `Lead reentrou via ${meta.webhook_name ? `webhook "${meta.webhook_name}"` : meta.source || 'sistema'}`;
      
    default:
      return activityLabels[activity.type] || activity.type;
  }
}
```

---

## Resumo das Mudanças

- **Aba Atividades**: Apenas "Próximas atividades" (cadência)
- **Histórico**: Labels claras mostrando fila de distribuição e responsável
- **Reentrada**: Sempre terá responsável (redistribui ou mantém)
- **Configuração**: Nova opção nas filas para controlar comportamento de reentrada
- **Cronologia**: Eventos ordenados corretamente com informações completas

