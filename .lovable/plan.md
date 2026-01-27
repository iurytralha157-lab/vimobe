
# Plano de Correção: Histórico Completo e Reentrada de Leads

## Diagnóstico Completo

Após análise detalhada, identifiquei **dois problemas principais**:

### Problema 1: Histórico não aparece imediatamente

**Causa**: O trigger `log_lead_activity` foi modificado para ignorar operações `INSERT` (para evitar race condition com FK), mas isso significa que quando um lead é criado, **nenhuma atividade "Lead criado" é registrada**.

**Evidência**: O lead `826c0f64...` foi criado em `03:03:03`, mas a primeira atividade é `lead_reentry` em `03:03:22` - não há atividade de criação.

### Problema 2: Reentrada não atualiza completamente o lead

**Causa**: O código atual do `generic-webhook` na lógica de reentrada (linhas 123-182):
- Atualiza apenas nome, email e message
- **NÃO** atualiza o estágio para o configurado no webhook
- **NÃO** limpa o responsável para redistribuição via round-robin
- **NÃO** atualiza o deal_status (se estava "lost", deveria voltar para "open")

**Comportamento esperado pelo usuário**: Quando um lead reentra, ele deve ser tratado "como se tivesse acabado de entrar" - voltar ao estágio configurado, passar pelo round-robin, atualizar status.

---

## Solução Proposta

### Parte 1: Corrigir Histórico Inicial

Modificar o trigger `log_lead_activity` para registrar a atividade de criação **usando um AFTER INSERT separado** ou registrar diretamente no webhook/edge function após o INSERT ser commitado.

**Opção escolhida**: Inserir a atividade `lead_created` diretamente no `generic-webhook` APÓS o lead ser criado com sucesso (já que o trigger ignora INSERT).

**Alterações no `generic-webhook/index.ts`**:
```typescript
// Após linha 231 (após lead criado com sucesso)
// Registrar atividade de criação manualmente
await supabase.from('activities').insert({
  lead_id: lead.id,
  type: 'lead_created',
  content: `Lead criado via webhook "${webhook.name}"`,
  user_id: null,
  metadata: {
    source: 'webhook',
    webhook_id: webhook.id,
    webhook_name: webhook.name,
    pipeline_name: webhook.pipeline?.name,
    stage_name: webhook.stage?.name,
  }
});
```

### Parte 2: Reentrada Completa do Lead

Modificar a lógica de reentrada no `generic-webhook` para:

1. **Atualizar o estágio** para o configurado no webhook
2. **Limpar o responsável** para que o round-robin redistribua
3. **Resetar deal_status** para "open" (se estava "lost" ou "won")
4. **Atualizar stage_entered_at** para o timestamp atual
5. **Chamar handle_lead_intake** para redistribuição

**Código atual problemático** (linhas 127-137):
```typescript
const updateData: Record<string, any> = {};
if (mappedData.name && mappedData.name !== 'unknown') updateData.name = mappedData.name;
if (mappedData.email) updateData.email = mappedData.email;
if (mappedData.message) updateData.message = mappedData.message;
```

**Código corrigido**:
```typescript
// Determinar estágio de destino
let targetStageId = webhook.target_stage_id;
if (!targetStageId && webhook.target_pipeline_id) {
  const { data: firstStage } = await supabase
    .from('stages')
    .select('id')
    .eq('pipeline_id', webhook.target_pipeline_id)
    .order('position', { ascending: true })
    .limit(1)
    .single();
  targetStageId = firstStage?.id;
}

// Preparar dados de atualização completa
const updateData: Record<string, any> = {
  // Dados do formulário
  ...(mappedData.name && mappedData.name !== 'unknown' && { name: mappedData.name }),
  ...(mappedData.email && { email: mappedData.email }),
  ...(mappedData.message && { message: mappedData.message }),
  // Resetar para reprocessamento
  stage_id: targetStageId || existingLead.stage_id, // Mover para estágio configurado
  pipeline_id: webhook.target_pipeline_id || existingLead.pipeline_id,
  assigned_user_id: null, // Limpar para round-robin redistribuir
  deal_status: 'open', // Resetar status
  won_at: null,
  lost_at: null,
  lost_reason: null,
  stage_entered_at: new Date().toISOString(),
  first_touch_at: null, // Resetar timer do bolsão
};

await supabase
  .from('leads')
  .update(updateData)
  .eq('id', existingLead.id);

// Chamar handle_lead_intake para redistribuição
await supabase.rpc('handle_lead_intake', { p_lead_id: existingLead.id });
```

---

## Detalhes Técnicos

### Fluxo Completo de Reentrada

```text
Lead existente detectado (mesmo telefone)
  │
  ├─→ Atualizar dados (nome, email, message)
  │
  ├─→ Mover para estágio do webhook (ex: "Base")
  │
  ├─→ Resetar deal_status para "open"
  │
  ├─→ Limpar assigned_user_id
  │
  ├─→ Registrar atividade "lead_reentry" com detalhes
  │
  ├─→ Triggers AFTER UPDATE disparam:
  │     ├─→ log_lead_activity: registra stage_change, assignee_changed
  │     └─→ trigger_lead_intake: chama handle_lead_intake para round-robin
  │
  └─→ Lead é redistribuído automaticamente
```

### Atividade de Reentrada Melhorada

```typescript
await supabase.from('activities').insert({
  lead_id: existingLead.id,
  type: 'lead_reentry',
  content: `Lead reentrou via webhook "${webhook.name}"`,
  user_id: null,
  metadata: {
    source: 'webhook',
    webhook_id: webhook.id,
    webhook_name: webhook.name,
    from_stage_id: oldStageId,
    to_stage_id: targetStageId,
    from_status: oldDealStatus,
    to_status: 'open',
    previous_assignee_id: oldAssigneeId,
    new_data: mappedData,
  }
});
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generic-webhook/index.ts` | 1. Adicionar atividade `lead_created` após INSERT bem-sucedido |
| `supabase/functions/generic-webhook/index.ts` | 2. Reescrever lógica de reentrada para atualização completa |
| `supabase/functions/generic-webhook/index.ts` | 3. Chamar `handle_lead_intake` após reentrada |

---

## Impacto

- **Histórico**: Leads novos terão atividade "Lead criado" imediatamente visível
- **Reentrada**: Leads que reentram serão completamente reprocessados:
  - Voltam ao estágio configurado no webhook
  - Passam pelo round-robin novamente
  - Status resetado para "open"
  - Histórico preservado com todas as interações anteriores
- **Compatibilidade**: Funciona com qualquer fonte (webhook, Facebook, WhatsApp, etc.)

---

## Próximos Passos

1. Atualizar a edge function `generic-webhook`
2. Fazer deploy
3. Testar com um lead novo (verificar atividade "Lead criado")
4. Testar reentrada de lead existente (verificar movimentação + redistribuição)
