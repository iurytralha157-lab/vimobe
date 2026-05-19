## Diagnóstico da duplicidade atual

Hoje, quando um lead entra pelo Meta, **4 caminhos diferentes** disparam notificação para o mesmo evento:

1. Trigger `trigger_notify_new_lead` (DB) — insere notificação "Novo lead"
2. Trigger `trigger_lead_intake` → `handle_lead_intake` → `notify_whatsapp_on_lead` (DB) — dispara WhatsApp "Novo lead recebido"
3. Triggers `trg_notify_lead_assigned` + `trigger_notify_lead_assigned` + `trigger_notify_lead_first_assignment` (3 triggers redundantes na mesma coluna) — disparam "Lead atribuído"
4. Frontend `notifyLeadCreated()` (use-lead-notifications.ts) — dispara via `notification-dispatcher` para vendedor + líderes + admins, com 3 títulos diferentes ("Novo lead recebido", "Novo lead na equipe", "Novo lead criado")

Resultado: 2 a 3 notificações simultâneas + WhatsApp com rodapé de organização misturado em mensagens de automação.

---

## Plano de execução

### Fase 1 — Limpeza de triggers duplicados (migration SQL)

Remover triggers redundantes, manter apenas um caminho canônico por evento:

```text
DROP triggers:
  - trg_notify_lead_assigned            (duplicado)
  - trigger_notify_lead_assigned        (duplicado)
  - trigger_notify_lead_first_assignment (lógica movida)
  - trigger_notify_new_lead             (substituído por handle_lead_intake)

MANTER:
  - trigger_lead_intake (INSERT)  → único responsável pelo "Novo lead recebido"
  - novo trigger "trigger_lead_manual_assignment" (UPDATE)
       → dispara APENAS quando assigned_user_id muda por ação humana
         (detectado via coluna nova `last_assignment_source` = 'manual')
```

Adicionar coluna `leads.last_assignment_source text` ('auto' | 'manual' | 'roundrobin') e atualizar:
- `handle_lead_intake` e round-robin → setam `'auto'`
- UPDATEs vindos da UI (kanban/lead-card) → setam `'manual'` antes do save

A função `notify_lead_assigned` só envia notificação se `NEW.last_assignment_source = 'manual'`.

### Fase 2 — Refatorar caminho de criação de lead

- Remover `notifyLeadCreated()` em `src/hooks/use-lead-notifications.ts` (e todas as 7 chamadas no frontend/edge functions).
- Toda notificação de "novo lead" passa a vir exclusivamente do `handle_lead_intake` (DB) → `notification-dispatcher` com template `new_lead_received`.
- Destinatários definidos no dispatcher: vendedor atribuído (se houver) **OU** líderes da pipeline **OU** admins — escolhe o destino mais específico, nunca os três.

### Fase 3 — Sanear conteúdo das mensagens

Atualizar templates em `notification_templates`:

```text
new_lead_received:
  title:   "📌 Novo lead recebido"
  message: "Lead: {{lead_name}}\nPipeline: {{pipeline_name}}\n\nAcesse o CRM para mais detalhes."

lead_assigned_manual (NOVO):
  title:   "📌 Novo lead atribuído para você"
  message: "Lead: {{lead_name}}\nPipeline: {{pipeline_name}}\n\nAcesse o CRM para mais detalhes."
```

Remover de TODOS os templates: telefone, e-mail, origem, source, valores. Apenas `lead_name`, `pipeline_name`, `user_name`, `organization_name`.

### Fase 4 — Lógica de organização contextual

Em `whatsapp-notifier/index.ts`:
- Remover o append automático `🏢 Organização: ...` que existe hoje (linhas ~115-120).
- Adicionar parâmetro `append_org_context: boolean` no payload.
- `notification-dispatcher` calcula esse flag: `SELECT count(*) FROM users WHERE id = user_id` em `user_organizations` (ou equivalente). Se > 1 → true.

**Crítico:** `automation-executor` e `message-sender` (caminho das automações) **NUNCA** passam por `whatsapp-notifier`. Eles enviam direto via Evolution API com o texto literal da automação. Auditar e garantir que nenhuma automação invoque `whatsapp-notifier` (hoje só `notification-service` o faz, mas confirmar).

### Fase 5 — Central de Notificações no Super Admin

A página `/admin/notifications` já existe (`AdminNotifications.tsx` + `NotificationSettings.tsx`). Expandir:

- CRUD completo de templates: título, mensagem, ícone, canais (system/whatsapp/push), variáveis disponíveis, evento gatilho, ativo/inativo.
- Preview ao vivo (renderiza com lead fictício).
- Lista de eventos suportados fixa no código (registry):
  ```text
  new_lead_received, lead_assigned_manual, lead_lost, deal_won,
  whatsapp_received, lead_no_response, task_overdue,
  pipeline_stage_changed, appointment_reminder, new_appointment
  ```
- Toggle por evento × canal (matriz).
- Editor de variáveis com chips clicáveis: `{{lead_name}}`, `{{pipeline_name}}`, `{{organization_name}}`, `{{user_name}}`, `{{stage_name}}`.

### Fase 6 — Arquitetura desacoplada (refactor leve)

Reorganizar responsabilidades sem reescrever tudo:

```text
[Evento de domínio]  →  notification-dispatcher  →  [Canal]
  (trigger DB ou                  │
   edge function)                 ├── system   → tabela notifications
                                  ├── push     → send-push
                                  └── whatsapp → whatsapp-notifier (transport puro)

[Automação do usuário] → automation-executor → message-sender → Evolution API
   (nunca toca notification-dispatcher nem whatsapp-notifier)
```

Reforçar dedupe key no `notification-dispatcher` (já existe `dedupe_window_seconds` no template) com chave canônica `{event_key}:{lead_id}:{user_id}` em janela de 60s, evitando race entre trigger DB e fallback.

---

## Detalhes técnicos

**SQLs necessários (consolidados em 1 migration):**
- DROP dos 4 triggers redundantes
- ALTER `leads` ADD `last_assignment_source text DEFAULT 'auto'`
- CREATE trigger `trigger_lead_manual_assignment` com WHEN clause
- INSERT/UPDATE em `notification_templates` para os textos novos + template `lead_assigned_manual`
- Função helper `user_has_multiple_orgs(uuid) returns boolean` (SECURITY DEFINER, search_path=public)

**Arquivos frontend a alterar:**
- `src/hooks/use-lead-notifications.ts` — remover funções, manter só re-export vazio para compat
- `src/services/NotificationService.ts` — adicionar opção `dedupeKey`
- Chamadores de `notifyLeadCreated`: marcar `last_assignment_source='manual'` quando vier da UI
- `src/components/admin/settings/NotificationSettings.tsx` — expandir editor (CRUD + matriz canais)

**Edge functions a alterar:**
- `whatsapp-notifier/index.ts` — remover append organização; aceitar `append_org_context`
- `notification-dispatcher/index.ts` — calcular `append_org_context`, reforçar dedupe, escolher destinatário único
- `public-site-contact/index.ts` — remover segunda chamada duplicada (linhas 268 e 299)
- `create-user/index.ts` — auditar duplicidade (linhas 49 e 71)

**Não-objetivos desta entrega:**
- Não migrar histórico antigo da tabela `notifications`
- Não alterar push notifications (continuam via trigger `trigger_push_on_notification_insert`)
- Não mudar o visual do dropdown de notificações no header (só conteúdo)

---

## Validação ao final

1. Criar lead via webhook Meta → recebo **1** notificação ("📌 Novo lead recebido") no sistema e **1** no WhatsApp, sem telefone, sem rodapé de org (usuário com 1 org).
2. Atribuir manualmente lead a outro corretor no kanban → ele recebe **1** notificação "📌 Novo lead atribuído para você".
3. Disparar automação de boas-vindas → mensagem WhatsApp chega **sem** "🏢 Organização: ...".
4. Logar como usuário com 2+ organizações → notificações WhatsApp passam a incluir "🏢 Organização: X".
5. Editar texto do template "new_lead_received" no Super Admin → próxima notificação reflete a mudança sem deploy.
