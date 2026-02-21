

## Ocultar Conversas Vazias do WhatsApp

### Problema
Conversas sem nenhuma mensagem aparecem na lista, dando a impressao de que existe historico salvo quando na verdade estao vazias.

### Solucao
Filtrar conversas onde `last_message_at` e `NULL` diretamente na query do Supabase. Conversas sem mensagens nunca tiveram `last_message_at` preenchido, entao basta adicionar `.not("last_message_at", "is", null)` na query.

### Alteracoes

**Arquivo: `src/hooks/use-whatsapp-conversations.ts`**
- Na funcao `useWhatsAppConversations`, adicionar filtro `.not("last_message_at", "is", null)` na query principal (logo apos o `.is("deleted_at", null)`)
- Isso remove conversas vazias tanto na pagina de Conversas quanto no FloatingChat

**Arquivo: `src/components/chat/FloatingChat.tsx`** (nenhuma alteracao necessaria - usa o mesmo hook)

### Impacto
- Conversas que ja possuem mensagens continuam aparecendo normalmente
- Conversas criadas manualmente so aparecerao apos a primeira mensagem ser enviada/recebida
- Nenhum dado e deletado do banco, apenas ocultado da listagem

### Tecnico
Uma unica linha adicionada na query:
```typescript
.not("last_message_at", "is", null)
```
