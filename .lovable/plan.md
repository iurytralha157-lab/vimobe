

# Melhorias no Lead Detail e Dashboard de Campanhas

## Resumo das solicitações

O usuário pediu 3 coisas distintas. Vou organizar por etapas:

---

### Etapa 1: Remover aba "Mensagens" do card do lead

**O que muda:**
- Remover o item `{ id: 'messages', label: 'Mensagens', icon: MessageCircle }` do array `tabs` (linha ~568-572)
- Remover o `TabsContent value="messages"` no desktop (linha ~1671-1674)
- Remover o `activeTab === 'messages'` no mobile (linha ~829-830)
- Remover o import de `LeadMessagesTab` (linha 34)
- Os arquivos `LeadMessagesTab.tsx` e `use-lead-messages.ts` continuam existindo pois podem ser usados futuramente

---

### Etapa 2: Melhorar o criativo/vídeo na seção de Rastreamento do lead

**Problema atual:** O meta-webhook já busca `creative_url` via API do Meta, mas só pega `effective_image_url` ou `thumbnail_url`. Não busca o vídeo do criativo.

**O que muda no webhook (`meta-webhook/index.ts`):**
- Expandir os campos da API do Meta para incluir `effective_object_story_id` e `video_id`
- Fazer uma segunda chamada para buscar `source` (URL do vídeo) quando houver `video_id`
- Salvar no `lead_meta` um novo campo `creative_video_url` além do `creative_url` (imagem)

**O que muda no banco:**
- Adicionar coluna `creative_video_url text` na tabela `lead_meta`

**O que muda no frontend (`LeadTrackingSection.tsx`):**
- Se `creative_video_url` existir, renderizar um player de vídeo inline (tag `<video>`) com controles
- Se só tiver `creative_url` (imagem), mostrar a imagem inline com preview clicável
- Manter o botão "Ver Criativo" como link externo

**O que muda no `ConversationLeadPanel.tsx`:**
- Mesmo tratamento: mostrar preview do criativo (imagem ou vídeo) inline

---

### Etapa 3: Visibilidade de conversas WhatsApp para gestores e transferências

**Estado atual (já funciona):**
- Quando um lead é transferido, a conversa fica vinculada ao `lead_id`, então o novo responsável já consegue ver o histórico ao abrir o chat
- O `FloatingChat` busca conversas por `lead_id` primeiro

**O que precisa melhorar:**
- No `MessageBubble` (dentro do chat), quando `from_me = true`, já mostra o `sender_name` ou `session_owner_name`, mas precisa ficar mais claro visualmente quem enviou cada mensagem
- Para o gestor (quem tem `lead_view_all`), ele já pode ver o lead, mas precisa ver as conversas vinculadas. Atualmente a visibilidade do WhatsApp é restrita ao dono da sessão (`whatsapp_session_access`). Para o gestor ver a conversa do lead, ele precisa:
  1. Abrir via o card do lead (FloatingChat com `lead_id`) — isso já funciona pois a busca é por `lead_id`
  2. O problema é que a RLS de `whatsapp_messages` pode bloquear se o gestor não tem acesso à sessão

**Alterações necessárias:**
- No `MessageBubble` do chat, adicionar label mais visível do remetente (nome do corretor) nas mensagens enviadas, com cor diferenciada
- Verificar se a RLS de `whatsapp_messages` permite leitura quando o usuário tem acesso ao lead (via `lead_view_all` ou é o responsável atual). Se não, criar uma policy adicional

---

## Plano de execução por etapa

### Etapa 1 — Remover aba Mensagens (frontend only)
- Editar `LeadDetailDialog.tsx`: remover tab "messages" do array, remover TabsContent e condicional mobile, limpar import

### Etapa 2 — Criativo com vídeo
1. Migration: adicionar `creative_video_url text` em `lead_meta`
2. Atualizar `meta-webhook/index.ts`: buscar video_id e source URL do vídeo via Graph API
3. Atualizar `use-lead-meta.ts`: adicionar campo `creative_video_url`
4. Atualizar `LeadTrackingSection.tsx`: renderizar preview de imagem/vídeo inline
5. Atualizar `ConversationLeadPanel.tsx`: mesmo tratamento

### Etapa 3 — Visibilidade de conversas para gestores
1. Investigar RLS de `whatsapp_messages` e `whatsapp_conversations` para verificar se gestor com `lead_view_all` consegue ler mensagens de leads que supervisiona
2. Se necessário, criar policy RLS adicional
3. No `MessageBubble.tsx` do chat, melhorar a identificação visual do remetente (badge com nome do corretor)

