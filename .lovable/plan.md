

## Corrigir Conversas Fantasma (com last_message_at mas sem mensagens)

### Problema
312 conversas possuem `last_message_at` preenchido (porque tiveram mensagens no passado), mas todas as mensagens foram removidas na limpeza do banco. O filtro `.not("last_message_at", "is", null)` nao as oculta porque o campo ainda tem valor.

### Solucao
Executar um UPDATE para resetar `last_message_at` para NULL em todas as conversas que nao possuem nenhuma mensagem. Com isso, o filtro ja implementado no frontend passa a funcionar corretamente.

### Alteracao

**SQL (one-time, executar no Supabase SQL Editor):**
```sql
UPDATE whatsapp_conversations wc
SET last_message_at = NULL
WHERE wc.deleted_at IS NULL
  AND wc.last_message_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM whatsapp_messages wm 
    WHERE wm.conversation_id = wc.id
  );
```

Isso afeta 312 conversas. O filtro no frontend (`use-whatsapp-conversations.ts`) ja implementado na mudanca anterior fara o resto - essas conversas serao ocultadas automaticamente.

### Nenhuma alteracao de codigo necessaria
O filtro `.not("last_message_at", "is", null)` ja esta ativo. Basta corrigir os dados inconsistentes no banco.
