# Evolution Go — Fases Restantes

Infraestrutura base (Fases 1, 2, 3, 5, 9) já implementada. Agora vamos completar funcionalidades.

---

## Fase 4 — History Sync (Sincronização de Histórico)

**Objetivo:** Trazer conversas antigas do WhatsApp ao conectar uma instância nova.

- Adicionar ação `historySync` no `evolution-go-proxy` chamando `POST /chat/historySync/{instance}` com `{ count: 50 }` por chat.
- Estender `evolution-go-webhook` para processar evento `messages.upsert` em lote (batch insert em `whatsapp_messages` com `ON CONFLICT DO NOTHING` em `(session_id, remote_jid, evolution_message_id)`).
- Criar botão "Sincronizar Histórico" no card da sessão (`WhatsAppTab.tsx`) — visível apenas para provider `evolution_go`.
- Toast de progresso + invalidar cache do `useWhatsAppMessages` ao final.

---

## Fase 6 — Etiquetas (Labels)

**Objetivo:** Sincronizar e gerenciar etiquetas nativas do WhatsApp.

- Ações no proxy: `label.list`, `label.create`, `label.delete`, `label.assign`, `label.unassign` (endpoints `/label/*`).
- Webhook: tratar `labels.upsert` → upsert em `whatsapp_labels`; `chats.upsert` com labels → upsert em `whatsapp_chat_labels`.
- Hook `use-whatsapp-labels.ts` (list/create/assign/unassign).
- UI: chips de etiquetas no header do chat flutuante + popover para atribuir/criar; filtro por etiqueta na lista de conversas.

---

## Fase 7 — Grupos

**Objetivo:** Listar e gerenciar grupos do WhatsApp.

- Ações no proxy: `group.fetchAll`, `group.info`, `group.participants`, `group.inviteCode`, `group.updateName`, `group.updateDescription`, `group.updatePicture`, `group.leave`.
- Webhook: `groups.upsert` / `groups.update` → upsert em `whatsapp_groups`.
- Hook `use-whatsapp-groups.ts`.
- Nova aba "Grupos" dentro de `WhatsAppTab` (ou seção dedicada) com lista + drawer de detalhes (foto, descrição, participantes, link de convite, ações de admin).
- Mensagens de grupos no chat flutuante: badge "Grupo" + nome do participante remetente em cada mensagem (`participant` field do webhook).

---

## Fase 8 — Mídia & Áudio PTT

**Objetivo:** Envio completo de mídias e áudios PTT pelo Evolution Go.

- Ações no proxy:
  - `send.media` → `POST /message/sendMedia/{instance}` (image/video/document, base64 ou URL).
  - `send.audio` → `POST /message/sendWhatsAppAudio/{instance}` com `ptt: true` e `mediatype: audio` (OGG Opus).
  - `send.sticker`, `send.location`, `send.contact`.
- Reutilizar `media-worker` existente para download de mídias recebidas (já compatível via base64 do webhook).
- Atualizar `whatsapp-provider.ts` para rotear `sendMedia` / `sendAudio` por provider.
- UI do chat flutuante já suporta áudio PTT (gravação OGG Opus existente) — apenas garantir o roteamento.
- Validação: mídia ≤ 16MB (limite WhatsApp); compressão de imagens via canvas antes do upload.

---

## Fase 10 — Contatos, Avatares & Verificação de Número

**Objetivo:** Enriquecer perfis e validar números.

- Ações no proxy:
  - `contact.fetchAll` → `GET /chat/findContacts/{instance}`.
  - `contact.profilePicture` → `POST /chat/fetchProfilePictureUrl/{instance}`.
  - `contact.checkNumber` → `POST /chat/whatsappNumbers/{instance}` (valida se número tem WhatsApp).
  - `contact.checkBusiness` → identifica contas business.
- Job `sync-whatsapp-contacts` (edge function + pg_cron diário) para popular avatars de leads existentes.
- Coluna `whatsapp_avatar_url` no `leads` (se não existir) — exibir no kanban e chat.
- Botão "Verificar WhatsApp" no formulário de lead → exibe ✓ se número válido.

---

## Resumo de Arquivos

```text
Edge Functions:
  evolution-go-proxy/index.ts        (estender com ~15 novas ações)
  evolution-go-webhook/index.ts      (handlers de labels, groups, history batch)
  sync-whatsapp-contacts/index.ts    (NOVO — Fase 10)

Migrations:
  evolution_go_phase10.sql           (coluna whatsapp_avatar_url em leads, se faltar)

Frontend:
  src/hooks/use-whatsapp-labels.ts           (NOVO)
  src/hooks/use-whatsapp-groups.ts           (NOVO)
  src/hooks/use-whatsapp-contacts.ts         (NOVO)
  src/lib/whatsapp-provider.ts               (estender com sendMedia/sendAudio)
  src/components/settings/WhatsAppTab.tsx    (botão history sync + aba grupos)
  src/components/whatsapp/FloatingChat.tsx   (chips de labels + participant em grupos)
  src/components/whatsapp/LabelsPopover.tsx  (NOVO)
  src/components/whatsapp/GroupsList.tsx     (NOVO)
  src/components/whatsapp/GroupDetailDrawer.tsx (NOVO)
```

---

## Ordem de Execução Sugerida

1. **Fase 4** (history sync) — alto valor imediato após conectar.
2. **Fase 8** (mídia/áudio) — completa o envio básico.
3. **Fase 6** (labels) — organização.
4. **Fase 7** (grupos) — expansão de escopo.
5. **Fase 10** (contatos/avatares) — refinamento.

Posso executar tudo de uma vez ou pausar entre fases para você validar. Confirme se prefere alguma ordem diferente ou se quero seguir nessa sequência.
