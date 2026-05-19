# Plano: Otimização do Sistema de Conversas/Chat

Trabalho dividido em 6 fases independentes para evitar quebras. Cada fase pode ser validada isoladamente antes da próxima.

## Diagnóstico atual (medido agora)

- `whatsapp_messages`: **180 MB**, 305.844 mensagens
- **55%** são mensagens de grupo (168k), **91%** sem `lead_id` vinculado
- **75%** das mensagens (228k) têm mais de 15 dias
- Bulk do tamanho vem de **mensagens de grupo antigas sem vínculo a lead** — não de payloads brutos (a tabela não guarda payload completo, só campos limpos: bom)
- Realtime: existem **3 canais separados** escutando `whatsapp_messages` (conversations, paginated, global) — fonte provável dos delays/duplicidades

---

## Fase 1 — Sincronização Unificada (resolve delay entre flutuante / página / lead)

**Problema:** cada superfície tem seu próprio canal e cache isolado; quando uma mensagem chega, só um deles invalida — os outros esperam refetch.

**Mudanças (frontend, sem schema):**
1. Criar `useWhatsAppRealtimeBus` central (Provider montado no AppLayout) que abre **1 único canal** por organização para `whatsapp_messages` e `whatsapp_conversations`.
2. Esse bus alimenta o React Query cache via `setQueryData` em **3 chaves simultaneamente**: `["whatsapp-conversations"]`, `["whatsapp-messages-paginated", convId]` e `["lead-messages", leadId]`.
3. Remover os 3 canais duplicados (`messages-${convId}`, `messages-paginated-${convId}`, `whatsapp-realtime`).
4. Implementar **optimistic update** no envio: a mensagem aparece com `status='sending'` em todos os contextos antes do retorno do servidor; o realtime apenas confirma via `client_message_id`.

**Resultado:** mensagem aparece simultaneamente em flutuante, página de conversas e timeline do lead, com latência praticamente zero.

---

## Fase 2 — Abertura Instantânea do Chat Flutuante

**Problemas detectados:**
- `FloatingChat` (957 linhas) renderiza tudo de uma vez ao abrir
- Conversas + sessões + mensagens carregados em paralelo bloqueando UI
- Sem cache local entre sessões do navegador

**Mudanças:**
1. **Lazy-load** do conteúdo pesado: skeleton aparece em <50ms, lista de conversas carrega depois.
2. `staleTime: 60s` nas conversas (hoje refaz query ao reabrir) + `keepPreviousData`.
3. **Persistir cache de últimas conversas** em `localStorage` (top 20) via `persistQueryClient` — abertura sem rede mostra dados imediatamente.
4. Pré-fetch das mensagens da conversa ativa **ao hover/touch do botão flutuante** (300ms antes do clique completar).
5. Mensagens carregam paginadas progressivamente (já funciona, mas garantir que o primeiro `limit=30` não bloqueie a UI).

---

## Fase 3 — Persistência do Histórico ao Transferir Lead

**Validação necessária** (read-only):
- Hoje `whatsapp_conversations.lead_id` é a única ligação. Trocar `lead.assigned_to` **não afeta** as mensagens, mas precisamos confirmar que nenhum trigger limpa `conversation.lead_id` ao reatribuir.
- Verificar `sender_name` e `sender_jid` em mensagens antigas para garantir que mesmo após troca de responsável, a autoria original é preservada.

**Ajustes se necessário:**
- Garantir que `whatsapp_messages` **nunca** seja deletada por trigger de transferência.
- Adicionar coluna `sender_user_id uuid` (FK soft para `auth.users`) populada no envio para preservar autoria **mesmo se a sessão WhatsApp for trocada de dono**. Backfill via `session.owner_user_id` no momento do envio.

---

## Fase 4 — Retenção Automática (maior ganho de espaço)

**Estratégia conservadora** via `pg_cron` diário:

```text
A cada noite às 03:00:
1. DELETE whatsapp_messages WHERE conversation_id IN (
     SELECT id FROM whatsapp_conversations
     WHERE is_group = true AND lead_id IS NULL
   ) AND sent_at < now() - interval '15 days';

2. DELETE whatsapp_conversations WHERE is_group = true
     AND lead_id IS NULL
     AND last_message_at < now() - interval '30 days';

3. DELETE FROM media_jobs WHERE status='done' AND updated_at < now() - 30 days;

4. DELETE FROM meta_webhook_events WHERE created_at < now() - 30 days;
```

**Garantias:**
- Nunca apaga conversa com `lead_id IS NOT NULL`
- Nunca apaga conversa direta (1-a-1), mesmo sem lead — usuário pode ter histórico relevante
- Mídia no Storage tem job próprio de limpeza (`media-worker` já tem lógica de retenção)

**Ganho estimado:** ~120 MB de 180 MB (≈65% de redução imediata).

---

## Fase 5 — Otimização de Payloads e Mídia

**Payloads:** auditoria já mostra que `whatsapp_messages` **não** guarda webhook bruto — bom. Verificar se há `whatsapp_webhook_logs` ou similar acumulando (não apareceu na listagem). Manter como está.

**Mídia (Storage, fora do banco):**
1. Imagens entrantes: gerar **thumbnail 400px webp** no `media-worker` e usar nas listas; full-size só ao clicar.
2. Áudios: já chegam em OGG Opus do WhatsApp (ótimo), só validar que não estamos re-encodando.
3. Limpeza: arquivos cujas mensagens foram apagadas pela Fase 4 também são removidos do bucket.

---

## Fase 6 — Correção de Menções (`@ID` → `@Nome`)

**Problema:** webhook entrega menção como `@5511999998888` (JID). Hoje renderizamos cru.

**Solução em `MessageBubble.tsx`:**
1. Regex `@(\d{10,15})` no conteúdo.
2. Para cada match, lookup em ordem: `whatsapp_conversations.contact_name` por `remote_jid` → `leads.name` por telefone normalizado → fallback `@telefone formatado`.
3. Cache em memória dentro do componente pai (`useMentionResolver`) para não fazer N queries por mensagem.

---

## Detalhes Técnicos

**Arquivos principais a tocar:**
- `src/hooks/use-whatsapp-conversations.ts` — extrair canal global, remover canais duplicados
- `src/hooks/use-whatsapp-messages-paginated.ts` — consumir do bus em vez de abrir canal
- `src/hooks/use-lead-messages.ts` — idem + invalidação cross-cache
- `src/components/chat/FloatingChat.tsx` — lazy + skeleton + prefetch
- `src/components/chat/FloatingChatButton.tsx` — hover prefetch
- `src/components/whatsapp/MessageBubble.tsx` — resolver de menções
- Nova migration: índice parcial `idx_conv_groups_orphan` + `pg_cron` job
- `supabase/functions/media-worker/index.ts` — thumbnail webp
- (opcional Fase 3) migration adicionando `sender_user_id`

**SQL necessário** (fornecido ao final para você rodar):
- `pg_cron` job de limpeza diária
- Índice `whatsapp_conversations(is_group, lead_id, last_message_at)` para o DELETE rodar rápido

**O que NÃO será mexido:**
- Estrutura de `MessageBubble` visual
- Edge functions de envio (`message-sender`, `evolution-webhook`) na lógica de negócio — só ajustes pontuais de mídia
- Schema de `whatsapp_messages` (exceto coluna opcional Fase 3)

**Validação por fase:**
1. Enviar mensagem no flutuante → ver aparecer em <300ms na página `/crm/conversas` aberta em outra aba
2. Abrir flutuante 5x → tempo médio ao primeiro pixel <100ms
3. Transferir lead → histórico intacto, `sender_name` original
4. Rodar cleanup manualmente → conferir tamanho `whatsapp_messages` cair para ~60MB
5. Imagens em listas carregando como thumbnail webp
6. Menção `@5511...` renderiza como nome do contato

---

Posso começar pela **Fase 1 + Fase 4** (maior impacto: sincronização + 65% menos storage) e seguir nas demais. Confirma?
