# Refatoração do painel lateral da Agenda

Vamos transformar o painel lateral em um componente unificado para **visualizar, criar e editar** tarefas (substituindo o popup atual), corrigir o bug dos comentários, suportar **múltiplos responsáveis com avatares reais** e ajustar diversos detalhes de UX.

---

## 1. Correção do bug de comentários (causa raiz)

**Diagnóstico:** A tabela `schedule_event_comments` **não existe** no banco. O hook `use-schedule-comments.ts` também referencia colunas inexistentes (`assigned_to` em `schedule_events`, `link` em `notifications`, e a tabela `lead_history` que na verdade chama-se `lead_timeline_events`).

**Migração SQL:**
- Criar tabela `schedule_event_comments` (id, event_id FK, user_id, organization_id, content, created_at).
- RLS: usuários da mesma `organization_id` podem ler/inserir; apenas autor pode deletar.
- Index em `event_id`.

**Correções no hook `use-schedule-comments.ts`:**
- Trocar join `user:profiles` por `user:users` (o projeto usa tabela `users`).
- Trocar `lead_history` por `lead_timeline_events` com campos corretos (`event_type='schedule_comment'`, `description=content`).
- Notificação: remover `link`, usar apenas (user_id, organization_id, type, title, content).
- Notificar **todos os responsáveis** da nova tabela `schedule_event_assignees` (exceto autor), não só um.

---

## 2. Múltiplos responsáveis

**Migração SQL:**
- Criar tabela `schedule_event_assignees` (event_id FK CASCADE, user_id FK, primary_key composto).
- RLS por organização.
- Migrar dados: copiar `schedule_events.user_id` atual para a nova tabela como assignee padrão.
- Manter `user_id` em `schedule_events` como "criador/owner" (não remover, evita quebrar código).

**Hook `use-schedule-events.ts`:**
- Adicionar select de `assignees:schedule_event_assignees(user:users(id,name,avatar_url))`.
- No create/update: aceitar `assignee_ids: string[]` e sincronizar (delete + insert).

**UI no painel:**
- Componente `Avatar` passa a aceitar `avatarUrl` e renderizar `<img>` quando existir (hoje só mostra iniciais).
- Botão `+` abre popover com lista de usuários da org (reusar `UserFilter`/`useUsers`) para adicionar responsável.
- Cada avatar tem botão `×` no hover para remover.

---

## 3. Remoções e ajustes de UX no painel

- **Remover bloco "Prioridade"** completamente (linhas 337-365 em `Agenda.tsx`) e a constante `PRIORITY_CONFIG`.
- **Remover subtarefas mock** (não está conectado, gera confusão). Pode voltar no futuro como feature real.
- **Aumentar fonte do título do evento** de 15px para 18px, peso 600.
- **Bloco "Lead/Cliente"**: garantir que apareça sempre que `event.lead_id` existir (hoje depende de `event.lead` vir no join — confirmar que o select traz). Tornar clicável → link para `/crm/pipelines?lead={id}`.

---

## 4. Edição inline + bloqueio após conclusão

- **Horário editável** no painel: clicar no horário abre dois inputs `time` (início/fim) e salva onBlur. Bloqueado quando `status === 'completed'`.
- **Título editável** inline (clique → input). Mesmo bloqueio.
- **Responsáveis e descrição** também bloqueados após conclusão.
- Indicador visual sutil ("🔒 Concluída — somente leitura") no header quando bloqueado.

---

## 5. Formulário de cadastro vira Sheet lateral

Hoje `EventForm` abre como Dialog/popup. Vamos:
- Reaproveitar o **mesmo layout do `EventDetailPanel`** em um Sheet lateral (largura 360-400px, lado direito).
- Estado: `mode = 'view' | 'create' | 'edit'`. O mesmo componente serve aos 3.
- Campos no formato vertical do painel: Tipo de atividade, Assunto (título), Lead, Responsáveis (múltiplos), Data, Hora início, Hora fim, Duração (calculada), Descrição.
- Botões fixos no rodapé: **Cancelar** (ghost) e **Salvar** (primary).
- Comentários aparecem **só em modo view/edit** (precisa de evento criado).
- Botão "Novo" no topo da agenda passa a abrir esse Sheet em `mode='create'` (em vez do popup).
- `EventForm.tsx` antigo pode ser deletado depois ou mantido como fallback.

---

## 6. Notificações in-app

Hoje, ao criar/editar evento, `use-schedule-events.ts` já cria notificação em alguns casos (visit/meeting). Vamos:
- **Sempre** notificar todos os responsáveis adicionados em create.
- Em update, notificar **novos** responsáveis (diff).
- Tipo `schedule_assigned` / `schedule_updated` / `schedule_comment`.
- Confirmar que o `NotificationBell` no header escuta estes tipos (verificar `use-notifications.ts`).

---

## Detalhes técnicos / arquivos afetados

```text
supabase/migrations/
  └── (nova) create_schedule_comments_and_assignees.sql

src/hooks/
  ├── use-schedule-comments.ts        (corrigir tabela/colunas)
  └── use-schedule-events.ts          (suportar assignees[])

src/components/schedule/
  ├── EventDetailPanel.tsx            (NOVO arquivo, extraído de Agenda.tsx)
  ├── EventSheet.tsx                  (NOVO — wrapper view/create/edit)
  ├── AssigneePicker.tsx              (NOVO — popover de seleção)
  └── EventForm.tsx                   (deprecar/remover ao final)

src/pages/Agenda.tsx
  ├── remover EventDetailPanel inline, PRIORITY_CONFIG, subtarefas mock
  ├── botão "Novo" → abre EventSheet em mode='create'
  └── clique em evento → abre EventSheet em mode='view'

src/components/ui/avatar (helper local em Agenda)
  └── Avatar passa a aceitar avatarUrl e renderiza <img>
```

**Schema SQL resumido:**
```sql
CREATE TABLE schedule_event_comments (
  id uuid PK default gen_random_uuid(),
  event_id uuid REFERENCES schedule_events ON DELETE CASCADE,
  user_id uuid REFERENCES users,
  organization_id uuid REFERENCES organizations,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE schedule_event_assignees (
  event_id uuid REFERENCES schedule_events ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
```

---

## Fora do escopo (não fazer agora)

- Subtarefas reais persistidas.
- Edição em lote de eventos.
- Repetição/recorrência de evento.
- Notificação push web (apenas in-app por enquanto).
