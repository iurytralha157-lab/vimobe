

## Vinculacao Automatica de Conversas WhatsApp a Leads

### Problema
Existem **153 conversas** WhatsApp sem `lead_id` que possuem leads correspondentes pelo telefone. Isso causa perda de mensagens em limpezas de banco, pois conversas sem lead vinculado sao tratadas como "comuns".

### Solucao em 3 frentes

#### 1. Correcao retroativa (SQL one-time)
Vincular as 153 conversas existentes aos leads correspondentes usando a funcao `normalize_phone` que ja existe no banco.

```sql
UPDATE whatsapp_conversations wc
SET lead_id = (
  SELECT l.id FROM leads l
  WHERE l.organization_id = wc.organization_id
  AND normalize_phone(l.phone) = normalize_phone(wc.contact_phone)
  ORDER BY l.created_at DESC
  LIMIT 1
)
WHERE wc.lead_id IS NULL
  AND wc.is_group = false
  AND wc.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM leads l
    WHERE l.organization_id = wc.organization_id
    AND normalize_phone(l.phone) = normalize_phone(wc.contact_phone)
  );
```

#### 2. Vinculacao proativa no webhook (codigo)
Alterar o `evolution-webhook` para que, ao criar ou atualizar uma conversa, tente vincular ao lead pelo telefone **imediatamente**, nao apenas quando o lead responde.

Atualmente, a vinculacao so ocorre em dois cenarios:
- Quando o lead **responde** (bloco "STOP FOLLOW-UP ON REPLY", linha ~680)
- Quando a conversa vem de **Facebook Ads** (funcao `createLeadFromConversation`)

A mudanca sera: apos criar uma nova conversa (linha ~397) ou ao processar mensagem de conversa existente sem `lead_id`, executar a busca por lead com telefone normalizado e vincular automaticamente.

**Arquivo**: `supabase/functions/evolution-webhook/index.ts`

Apos a criacao de nova conversa (apos linha ~417), adicionar:
```typescript
// Auto-link conversation to existing lead by phone
if (!isGroup && !conversation.lead_id) {
  const normalizedPhone = normalizePhoneNumber(contactPhone);
  const { data: allLeads } = await supabase
    .from("leads")
    .select("id, phone")
    .eq("organization_id", session.organization_id)
    .not("phone", "is", null);

  const matchingLead = allLeads?.find(l => {
    if (!l.phone) return false;
    return normalizePhoneNumber(l.phone) === normalizedPhone;
  });

  if (matchingLead) {
    await supabase
      .from("whatsapp_conversations")
      .update({ lead_id: matchingLead.id })
      .eq("id", conversation.id);
    conversation.lead_id = matchingLead.id;
    console.log(`Auto-linked new conversation to lead ${matchingLead.id}`);
  }
}
```

Para conversas **existentes** sem `lead_id` (no bloco `else` da linha ~434), adicionar logica semelhante antes de processar a mensagem.

#### 3. Vinculacao ao criar lead manualmente (hook frontend)
Alterar o `useStartConversation` em `src/hooks/use-start-conversation.ts` para que, ao criar uma conversa a partir de um lead, o `lead_id` ja esteja sempre preenchido (isso ja acontece, mas garantir que o fluxo inverso tambem funcione).

### Resumo das alteracoes

| Local | Alteracao |
|-------|----------|
| SQL (one-time) | UPDATE para vincular 153 conversas existentes |
| `evolution-webhook/index.ts` | Auto-link ao criar nova conversa |
| `evolution-webhook/index.ts` | Auto-link ao processar mensagem em conversa existente sem lead |

### O que NAO muda
- Nenhum lead sera criado automaticamente (apenas vinculacao)
- Conversas de grupo continuam sem `lead_id`
- A logica de "stop follow-up on reply" continua funcionando como fallback

