## Vinculacao Automatica de Conversas WhatsApp a Leads

### Status: ✅ IMPLEMENTADO

### O que foi feito

#### 1. ✅ Auto-link no webhook (evolution-webhook/index.ts)
- Ao criar **nova conversa**: busca lead pelo telefone normalizado e vincula automaticamente
- Ao processar **conversa existente** sem `lead_id`: busca e vincula ao lead correspondente
- Lógica adicionada em dois pontos do `handleMessagesUpsert`

#### 2. ⏳ Correção retroativa (SQL one-time)
Execute o SQL abaixo no SQL Editor do Supabase para vincular as conversas existentes:

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

### O que NAO muda
- Nenhum lead sera criado automaticamente (apenas vinculacao)
- Conversas de grupo continuam sem `lead_id`
- A logica de "stop follow-up on reply" continua funcionando como fallback
