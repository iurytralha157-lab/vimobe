

## Historico de Mensagens por Lead e Ajuste no First Response

### Resumo das Mudancas

Tres ajustes principais:

1. **Remover first response do botao de WhatsApp** - O tempo de resposta so sera marcado quando uma mensagem for realmente enviada (ja acontece no `message-sender`) ou quando o webhook detectar envio pelo WhatsApp pessoal do corretor. Botoes de telefone e email continuam marcando pois nao temos controle sobre eles.

2. **Aba de historico de mensagens no detalhe do lead** - Quem tem acesso ao lead podera ver todas as mensagens WhatsApp trocadas com aquele contato, independente de qual instancia/corretor enviou.

3. **Identificacao do remetente** - Cada mensagem enviada mostrara qual corretor enviou, usando o `session.owner_user_id` para identificar.

---

### Detalhes Tecnicos

#### 1. Remover `recordFirstResponse` dos botoes de WhatsApp

**Arquivos:**
- `src/components/leads/LeadCard.tsx` - Remover `recordFirstResponse` de `handleWhatsAppClick`
- `src/components/leads/LeadDetailDialog.tsx` - Remover `recordFirstResponse` de `handleQuickWhatsApp`

O `message-sender` edge function ja chama `calculate-first-response` quando uma mensagem e realmente enviada (linhas 145-170). Isso garante que o first response so e marcado quando o corretor de fato envia uma mensagem, nao quando clica no botao.

Para mensagens recebidas pelo webhook do WhatsApp pessoal do corretor, o `evolution-webhook` ja vincula conversas a leads. Precisaremos adicionar a chamada de `calculate-first-response` no webhook quando uma mensagem `from_me: true` for recebida para um lead vinculado (cobrindo o caso de envio pelo app nativo do WhatsApp).

#### 2. Historico de mensagens no detalhe do lead

**Novo hook:** `src/hooks/use-lead-messages.ts`
- Busca todas as conversas (`whatsapp_conversations`) vinculadas ao `lead_id`
- Busca todas as mensagens dessas conversas
- Ordena cronologicamente
- Inclui dados da sessao (instance_name, owner_user_id) para identificar quem enviou

**Novo componente:** `src/components/leads/LeadMessagesTab.tsx`
- Lista de mensagens estilo chat (bolhas)
- Mensagens enviadas (from_me) mostram nome do corretor (via session owner)
- Mensagens recebidas mostram nome do contato
- Separadores de data entre mensagens
- Suporte a midia (imagens, audio, documentos)

**Arquivo modificado:** `src/components/leads/LeadDetailDialog.tsx`
- Adicionar nova aba "Mensagens" nas tabs do lead detail
- A aba so aparece se existirem conversas vinculadas ao lead

#### 3. First response via webhook (mensagens do WhatsApp nativo)

**Arquivo:** `supabase/functions/evolution-webhook/index.ts`
- Na secao de processamento de mensagens `from_me: true`, verificar se a conversa tem `lead_id`
- Se tiver, chamar `calculate-first-response` com o `owner_user_id` da sessao
- Tambem marcar `first_touch_at` no lead (mesmo comportamento do `message-sender`)

#### 4. Acesso baseado no lead (nao na sessao)

A query de mensagens no novo hook usara o `lead_id` para buscar conversas, respeitando o acesso ao lead (quem pode ver o lead, pode ver as mensagens). Isso e diferente do acesso ao WhatsApp (sessao), que e restrito ao dono/autorizado.

```text
Fluxo de acesso:
Lead acessivel -> Conversas vinculadas ao lead -> Mensagens dessas conversas
(Nao depende de whatsapp_session_access)
```

### Arquivos a Criar/Modificar

```text
CRIAR:
1. src/hooks/use-lead-messages.ts
   - Hook para buscar mensagens de todas as conversas de um lead
   
2. src/components/leads/LeadMessagesTab.tsx
   - Componente de visualizacao do historico de mensagens do lead

MODIFICAR:
3. src/components/leads/LeadCard.tsx
   - Remover recordFirstResponse do handleWhatsAppClick

4. src/components/leads/LeadDetailDialog.tsx
   - Remover recordFirstResponse do handleQuickWhatsApp
   - Adicionar aba "Mensagens" com LeadMessagesTab

5. supabase/functions/evolution-webhook/index.ts
   - Adicionar first response tracking para mensagens from_me via webhook
```

### Comportamento Final

- Corretor clica no botao WhatsApp no Kanban: abre chat, NAO marca first response
- Corretor envia mensagem pelo sistema (FloatingChat): marca first response via `message-sender`
- Corretor envia mensagem pelo WhatsApp nativo: webhook recebe, marca first response via `evolution-webhook`
- Gestor/admin abre detalhe do lead: ve aba "Mensagens" com todo historico de conversas
- Lead transferido para outro corretor: historico preservado, novo corretor ve tudo
