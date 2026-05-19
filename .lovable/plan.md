
# Integração Evolution Go — Plano em Fases

## Visão Geral

O Evolution Go é uma reescrita em Golang do Evolution API tradicional. A documentação Swagger está em `https://evogo.vettercompany.com.br/swagger/index.html`. As rotas são similares mas com diferenças importantes:

- **Endpoints novos / diferentes**: `/instance/create`, `/instance/connect`, `/instance/qr`, `/instance/status`, `/instance/forcereconnect/{id}`, `/instance/pair`, `/send/text`, `/send/media`, `/send/audio` (via `/send/media`), `/message/downloadimage`, `/message/edit`, `/message/delete`, `/message/markread`, `/message/react`, `/chat/history-sync-request`, `/chat/archive|mute|pin`, `/label`, `/label/chat`, `/label/message`, `/group/*`, `/user/avatar`, `/user/contacts`, `/user/check`.
- **Autenticação**: header `apikey` global + `instanceId` por instância (mesmo modelo do Evolution clássico).
- **Webhook**: configurado por instância (eventos `messages.upsert`, `connection.update`, `qrcode.updated`, etc., compatíveis com o webhook atual com pequenas diferenças de payload).

Objetivo: **reutilizar** toda a UI/infra de Conversas, manter histórico antigo e ligar uma nova instância pelo provider “Evolution Go” em paralelo, com QR code, download de mídia, áudio PTT, labels, grupos e som novo de notificação.

---

## Pré-requisitos (Secrets)

Precisamos das seguintes chaves (vou pedir via tool após aprovação do plano):

1. `EVOLUTION_GO_API_URL` — ex.: `https://evogo.vettercompany.com.br`
2. `EVOLUTION_GO_API_KEY` — chave global (apikey) do Evolution Go

Mantemos as secrets antigas `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` para o legado continuar funcionando.

---

## Fase 1 — Esquema de banco (provider + audit)

Adiciona uma coluna `provider` em `whatsapp_sessions` para diferenciar `evolution` (legado) de `evolution_go`. Mantém todo o histórico intacto. Inclui colunas para suporte a labels, grupos e configurações avançadas.

```sql
-- Phase 1: Evolution Go provider support
ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'evolution'
    CHECK (provider IN ('evolution','evolution_go'));

ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS advanced_settings jsonb DEFAULT '{}'::jsonb;

-- Labels (tags do WhatsApp)
CREATE TABLE IF NOT EXISTS public.whatsapp_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  remote_label_id text NOT NULL,
  name text NOT NULL,
  color int,
  predefined boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, remote_label_id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_chat_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.whatsapp_labels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (conversation_id, label_id)
);

-- Grupos do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  group_jid text NOT NULL,
  subject text,
  description text,
  picture_url text,
  invite_link text,
  participants jsonb DEFAULT '[]'::jsonb,
  is_announce boolean DEFAULT false,
  owner_jid text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (session_id, group_jid)
);

ALTER TABLE public.whatsapp_labels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chat_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels_org_read" ON public.whatsapp_labels
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "labels_org_manage" ON public.whatsapp_labels
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "chat_labels_org_read" ON public.whatsapp_chat_labels
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.whatsapp_conversations c
                 WHERE c.id = whatsapp_chat_labels.conversation_id
                   AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "chat_labels_org_manage" ON public.whatsapp_chat_labels
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.whatsapp_conversations c
                 WHERE c.id = whatsapp_chat_labels.conversation_id
                   AND c.organization_id = public.get_user_organization_id()));

CREATE POLICY "groups_org_read" ON public.whatsapp_groups
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "groups_org_manage" ON public.whatsapp_groups
  FOR ALL TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE INDEX IF NOT EXISTS idx_labels_session ON public.whatsapp_labels(session_id);
CREATE INDEX IF NOT EXISTS idx_groups_session ON public.whatsapp_groups(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_labels_conv ON public.whatsapp_chat_labels(conversation_id);
```

**Sem apagar mensagens.** Histórico de leads permanece. Conversas de grupos antigos (sem `lead_id`) podem ser limpas opcionalmente em uma fase futura — fora do escopo desta.

---

## Fase 2 — Edge Function `evolution-go-proxy`

Nova função (espelho do `evolution-proxy` atual) que sabe roteamento Evolution Go.

Endpoints/ações expostas (POST `/functions/v1/evolution-go-proxy` com `action` no body):

| action | rota Evolution Go |
|---|---|
| `instance.create` | `POST /instance/create` |
| `instance.connect` | `POST /instance/connect` (com webhook URL) |
| `instance.qr` | `GET /instance/qr?instanceId=...` |
| `instance.status` | `GET /instance/status?instanceId=...` |
| `instance.disconnect` | `POST /instance/disconnect` |
| `instance.logout` | `DELETE /instance/logout` |
| `instance.delete` | `DELETE /instance/delete/{id}` |
| `instance.forceReconnect` | `POST /instance/forcereconnect/{id}` |
| `send.text` | `POST /send/text` |
| `send.media` | `POST /send/media` (imagem/vídeo/áudio/documento) |
| `send.audio` | `POST /send/media` com `mediatype=audio` PTT |
| `send.sticker` | `POST /send/sticker` |
| `send.location` | `POST /send/location` |
| `send.contact` | `POST /send/contact` |
| `message.delete/edit/react/markread` | `/message/*` |
| `message.downloadMedia` | `POST /message/downloadimage` |
| `chat.archive/mute/pin/unmute/unpin` | `/chat/*` |
| `chat.historySync` | `POST /chat/history-sync-request` |
| `label.list/edit/addChat/addMsg` | `/label*` |
| `group.list/info/create/participants/photo/...` | `/group/*` |
| `user.avatar/info/contacts/check` | `/user/*` |

Comportamento:
- Lê `EVOLUTION_GO_API_URL` / `EVOLUTION_GO_API_KEY`.
- Cabeçalho `apikey: ${EVOLUTION_GO_API_KEY}` em todas chamadas.
- Quando a ação envolver sessão (`session_id`), busca `instance_id` na tabela e injeta.
- Padroniza erros e retorna sempre `{ ok: boolean, data?, error? }`.

---

## Fase 3 — Edge Function `evolution-go-webhook`

Endpoint público (sem JWT) que o Evolution Go vai chamar para eventos:

- `qrcode.updated` → atualiza `whatsapp_sessions.status='qr'` + cache do QR em memória/realtime.
- `connection.update` → `connecting`/`connected`/`disconnected` (mantendo a lógica anti-flapping já existente).
- `messages.upsert` (inbound + outbound from_me) → mesmo pipeline de hoje:
  - normalizar telefone (já temos util com `55` opcional),
  - encontrar/criar `whatsapp_conversations`,
  - inserir em `whatsapp_messages` com `client_message_id` para dedupe,
  - vincular `lead_id` por telefone (reaproveitando `phone-normalization-matching`),
  - **não cria lead novo** se já existir conversa com aquele telefone/lead,
  - dispara `automation-trigger` apenas para eventos inbound novos.
- `messages.update` → atualiza status (`sent`/`delivered`/`read`).
- `chats.upsert` / `labels.upsert` / `groups.upsert` → sincroniza tabelas de labels e grupos.
- `media` em base64 → reaproveita `media-worker` (mesma fila atual).

Garantia de não duplicar leads: lookup do telefone normalizado em `leads` antes de criar; se conversa já existe (`whatsapp_conversations.remote_jid`), apenas anexa.

---

## Fase 4 — Sincronização de histórico (history-sync)

- Botão “Sincronizar histórico” na sessão Evolution Go → chama `chat.historySync`.
- Recebe eventos `messages.upsert` em lote pelo webhook.
- Dedupe por `client_message_id` + `(remote_jid, timestamp)`.

---

## Fase 5 — Frontend: provider toggle e nova sessão Evolution Go

Mudanças em `src/pages/WhatsAppSettings.tsx` e `src/components/settings/WhatsAppTab.tsx`:

1. No diálogo de “Nova sessão”, adicionar select **Provider**: `Evolution (Legado)` vs `Evolution Go (Novo)`.
2. Hook `use-whatsapp-sessions.ts` grava `provider` ao criar.
3. Criar `src/hooks/use-evolution-go.ts` com mutations: `createInstance`, `getQr`, `connect`, `disconnect`, `forceReconnect`, `sendText`, `sendMedia`, `sendAudio`, `historySync`, `listGroups`, `listLabels`, `addChatLabel`, `archiveChat`, `muteChat`, `pinChat`.
4. `use-whatsapp-conversations.ts` e componentes de chat passam a chamar `evolution-go-proxy` quando `session.provider === 'evolution_go'`; caso contrário, mantém o caminho legado. Encapsular num helper `whatsapp-provider-router.ts`.
5. UI 100% reaproveitada (`FloatingChat`, `MessageBubble`, `ConversationList`, `LeadMessagesTab`).

---

## Fase 6 — Labels (tags do WhatsApp)

- Página/sessão exibe labels sincronizadas (`whatsapp_labels`).
- Em cada conversa, dropdown “Adicionar tag”. Sincroniza com `POST /label/chat`.
- Webhook `labels.association` reflete mudanças externas.

---

## Fase 7 — Grupos

- Aba “Grupos” na sessão Evolution Go.
- Lista grupos (`/group/myall`), permite ver info, foto, participantes, link de convite, alterar nome/descrição/foto, sair, criar grupo, adicionar/remover/promover participantes.
- Grupos aparecem como conversa normal no chat (com nome do grupo + foto).
- Menções (`@5511...`) implementadas no `send.text` via campo `mentions` array.

---

## Fase 8 — Mídia, áudio PTT e download

- Envio de imagem/vídeo/documento: já temos UI; rotear para `send.media`.
- Áudio PTT: gravador atual gera OGG/Opus → `send.media` com `mediatype=audio` e `ptt=true`.
- Download de mídia recebida em base64: salvar no bucket `whatsapp-media` via `media-worker` (já existe). Compressão de imagens via canvas antes do upload (já implementado para automações — reaproveitar util).

---

## Fase 9 — Som de notificação novo

- Adicionar `public/sounds/whatsapp-pop.mp3` (som curto tipo “plop”).
- Criar `src/hooks/use-whatsapp-sound.ts`:
  - Escuta o `WhatsAppRealtimeBus` (já existe) para eventos `INSERT` em `whatsapp_messages` com `from_me=false`.
  - Toca `whatsapp-pop.mp3` (volume baixo, 0.4), throttle de 1.5s para não estourar.
  - Respeita preferência do usuário (toggle em Configurações → Notificações).
- Diferente do som de novo lead (que continua o atual em `use-notifications`).

---

## Fase 10 — Avatar, contatos e check de número

- `user.avatar` → cache em `whatsapp_conversations.avatar_url`.
- `user.contacts` → sincroniza nomes salvos na agenda do WhatsApp para o nome de exibição do lead/contato (sem sobrescrever nome customizado).
- `user.check` → validar número antes de iniciar conversa (ícone verde/vermelho no “Iniciar conversa”).

---

## Detalhes Técnicos

- **Roteamento por provider**: helper `getWhatsAppClient(session)` em `src/lib/whatsapp-provider.ts` retorna funções com a mesma assinatura (envia/recebe/etc) mas chamando o proxy certo. Garante que componentes não saibam diferença.
- **Dedupe**: chave `(session_id, remote_jid, evolution_message_id)` única em `whatsapp_messages`.
- **Preservação de leads**: webhook NUNCA apaga; lookup por `lead_id`→`conversation`→fallback telefone normalizado.
- **Velocidade**: chamadas diretas do front via `supabase.functions.invoke` com retry exponencial leve (já existe em `evolution-proxy`). Webhook usa `EdgeRuntime.waitUntil` para não bloquear resposta.
- **Realtime**: já temos `WhatsAppRealtimeBus` unificado — funciona para qualquer provider porque depende só de inserts em `whatsapp_messages`.
- **Segurança**: `evolution-go-webhook` valida header `apikey` igual ao secret antes de processar.

---

## Diagrama de Fluxo

```text
[Front-end React]
        |
        |  supabase.functions.invoke('evolution-go-proxy', {action, ...})
        v
[evolution-go-proxy] --HTTP(apikey)--> [Evolution Go server]
                                              |
                                              | webhook (POST)
                                              v
                                  [evolution-go-webhook]
                                              |
                                              | upserts em whatsapp_*
                                              v
                              [Postgres Realtime → Bus → UI]
```

---

## Entregáveis por Fase

1. Migration Fase 1 (envio em seguida).
2. `supabase/functions/evolution-go-proxy/index.ts`.
3. `supabase/functions/evolution-go-webhook/index.ts` + `verify_jwt=false` no `config.toml`.
4. `src/lib/whatsapp-provider.ts` + `src/hooks/use-evolution-go.ts`.
5. Update de `WhatsAppSettings.tsx` / `WhatsAppTab.tsx` com seleção de provider.
6. Telas de Labels e Grupos.
7. Som novo + hook.
8. QA: criar instância Evolution Go, ler QR, enviar/receber texto/imagem/áudio, sync histórico, vincular a lead existente sem duplicar.

Aprovando, na sequência peço os secrets `EVOLUTION_GO_API_URL` e `EVOLUTION_GO_API_KEY` e já começo pela Fase 1.
