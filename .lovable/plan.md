
# Plano: Corrigir "Parar ao Responder" nas Automações

## Problema Identificado

O recurso "Parar ao Responder" não funciona porque há uma **desconexão entre leads e conversas**:

```text
┌───────────────────────────────────────────────────────────────────────┐
│  AUTOMAÇÃO DISPARA                                                    │
│                                                                       │
│  automation_executions                                                │
│  ├─ lead_id: b59be9f8... ✅                                          │
│  └─ conversation_id: NULL ❌                                         │
│                                                                       │
│  LEAD RESPONDE NO WHATSAPP                                            │
│                                                                       │
│  whatsapp_conversations                                               │
│  ├─ contact_phone: 5522974063727                                     │
│  └─ lead_id: NULL ❌  ← Não vinculada ao lead!                       │
│                                                                       │
│  evolution-webhook verifica:                                          │
│  if (conversation.lead_id) { handleStopFollowUpOnReply() }            │
│                            ↑                                          │
│                   Nunca executa porque lead_id é NULL                 │
└───────────────────────────────────────────────────────────────────────┘
```

O lead existe com telefone `22974063727`, a conversa existe com `5522974063727`, mas **não estão vinculados**.

---

## Solução

Modificar o `evolution-webhook` para buscar o lead **pelo telefone** quando a conversa não tem `lead_id`, antes de decidir se deve parar a automação.

### Mudança no `evolution-webhook/index.ts`

**Antes (linha 637-640):**
```typescript
if (conversation.lead_id) {
  await handleStopFollowUpOnReply(supabase, conversation.id, conversation.lead_id);
}
```

**Depois:**
```typescript
// STOP ON REPLY: Check for active automations even if conversation has no lead_id
// Leads may be created separately and not linked to conversations yet
let leadIdForStop = conversation.lead_id;

if (!leadIdForStop) {
  // Try to find lead by phone number (with or without country code)
  const phoneVariants = [
    contactPhone,                                    // 5522974063727
    contactPhone.replace(/^55/, ''),                 // 22974063727
    `55${contactPhone}`,                            // 555522974063727 (edge case)
  ];
  
  const { data: matchingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("organization_id", session.organization_id)
    .or(phoneVariants.map(p => `phone.eq.${p}`).join(','))
    .limit(1)
    .maybeSingle();
  
  if (matchingLead) {
    leadIdForStop = matchingLead.id;
    console.log(`Found lead ${leadIdForStop} by phone match for stop-on-reply`);
    
    // BONUS: Link the conversation to the lead for future
    await supabase
      .from("whatsapp_conversations")
      .update({ lead_id: matchingLead.id })
      .eq("id", conversation.id);
  }
}

if (leadIdForStop) {
  await handleStopFollowUpOnReply(supabase, conversation.id, leadIdForStop);
}
```

---

## Fluxo Corrigido

```text
┌───────────────────────────────────────────────────────────────────────┐
│  LEAD RESPONDE NO WHATSAPP                                            │
│         │                                                             │
│         ▼                                                             │
│  evolution-webhook                                                    │
│  ├─ conversation.lead_id = NULL?                                     │
│  │         │                                                         │
│  │         ▼ SIM                                                      │
│  │  Busca lead pelo telefone (22974063727 ou 5522974063727)          │
│  │         │                                                         │
│  │         ▼ ENCONTROU                                                │
│  │  ├─ Vincula conversa ao lead (update conversation.lead_id)        │
│  │  └─ leadIdForStop = lead.id                                       │
│  │                                                                   │
│  ├─ if (leadIdForStop) handleStopFollowUpOnReply()                   │
│  │         │                                                         │
│  │         ▼                                                          │
│  │  Cancela automações com stop_on_reply: true                       │
│  │  Move lead para etapa configurada (se houver)                     │
│  │                                                                   │
│  └─ ✅ Automação parada com sucesso                                   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Benefícios Adicionais

1. **Auto-vinculação**: Ao encontrar o lead pelo telefone, a conversa é automaticamente vinculada para futuras mensagens
2. **Normalização de telefone**: Busca com e sem código de país (55)
3. **Segurança**: Filtra por `organization_id` para não vincular leads de outras organizações

---

## Detalhes Técnicos

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/evolution-webhook/index.ts` | Adicionar busca de lead por telefone antes de chamar `handleStopFollowUpOnReply` |

### Lógica de Busca por Telefone

A busca considera que o telefone do lead pode estar salvo de diferentes formas:
- `22974063727` (sem código de país)
- `5522974063727` (com código de país)

A busca usa OR para encontrar qualquer variante.

### Performance

A busca adicional só acontece quando `conversation.lead_id` é NULL, então não afeta mensagens de leads já vinculados.
