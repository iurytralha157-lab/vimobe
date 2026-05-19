## Refatoração WhatsApp como HUB de Leads

Objetivo: transformar `whatsapp_session_access` de "espelhamento total" em "permissão operacional", criar identificação/distribuição automática de leads e blindar visibilidade por RLS.

### Diagnóstico crítico (já investigado)

1. **Furo de RLS atual:** existem DUAS policies de SELECT em `whatsapp_conversations` (`conversations_privacy_policy` + `conversations_select` antiga). PostgreSQL faz OR entre policies, então a antiga (`can_access_whatsapp_session`) **anula** a nova "apenas leads". Mesma situação em `whatsapp_messages`. Precisamos consolidar.
2. **Reaproveitar infra existente:** `round_robins` + `round_robin_rules` (já fazem match por `campaign`/`source`/palavra-chave via `match_type/match_value`), `lead_assignment_history`, `leads.assigned_user_id`, `team_members.is_leader`. Não recriar.
3. **Leads já têm:** `source`, `source_session_id`, `meta_lead_id`, `meta_form_id`, `assigned_user_id`. Falta `meta_campaign_id`, `meta_adset_id`, `meta_ad_id`, `meta_click_id`, `utm_source/medium/campaign/content/term`.
4. **Fluxo inbound:** `evolution-webhook/index.ts` já cria conversas e tem hook `automation-trigger`. É o ponto natural para inserir identificação+distribuição automática.

---

### Fase 1 — Schema (SQLs numerados pra rodar no Supabase)

**SQL 1 — Tracking Meta/UTM nos leads**
```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS meta_campaign_id text,
  ADD COLUMN IF NOT EXISTS meta_adset_id text,
  ADD COLUMN IF NOT EXISTS meta_ad_id text,
  ADD COLUMN IF NOT EXISTS meta_click_id text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS initial_message text;
CREATE INDEX IF NOT EXISTS idx_leads_meta_campaign ON public.leads(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_meta_click ON public.leads(meta_click_id);
```

**SQL 2 — Regras de identificação inbound de WhatsApp**
```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE, -- null = todas as sessões da org
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  -- matching
  match_type text NOT NULL CHECK (match_type IN ('contains','equals','regex','utm','meta_ctwa','any')),
  match_value text,                -- palavra/regex/utm-campaign etc
  match_field text DEFAULT 'message', -- message|push_name|phone|meta_source_id
  -- routing
  target_round_robin_id uuid REFERENCES public.round_robins(id) ON DELETE SET NULL,
  target_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  target_user_id uuid,             -- assigned_user_id direto, opcional
  target_pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL,
  target_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  -- enrichment
  source_label text,               -- preenche leads.source
  campaign_label text,             -- preenche leads.utm_campaign
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inbound_rules_org_active
  ON public.whatsapp_inbound_rules(organization_id, is_active, priority);
ALTER TABLE public.whatsapp_inbound_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbound_rules_select ON public.whatsapp_inbound_rules
  FOR SELECT USING (organization_id = get_user_organization_id() OR is_super_admin());
CREATE POLICY inbound_rules_manage ON public.whatsapp_inbound_rules
  FOR ALL USING ((organization_id = get_user_organization_id() AND is_admin()) OR is_super_admin())
  WITH CHECK ((organization_id = get_user_organization_id() AND is_admin()) OR is_super_admin());
```

**SQL 3 — Log de identificação/distribuição**
```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  session_id uuid,
  conversation_id uuid,
  lead_id uuid,
  matched_rule_id uuid,
  match_details jsonb,
  assigned_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_inbound_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbound_logs_select ON public.whatsapp_inbound_logs
  FOR SELECT USING (organization_id = get_user_organization_id() OR is_super_admin());
```

**SQL 4 — Acesso operacional (modos de visibilidade)**
```sql
-- Substitui o atual booleano "only_leads_access" por um enum mais explícito
ALTER TABLE public.whatsapp_session_access
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'assigned_leads_only'
    CHECK (access_mode IN ('assigned_leads_only','team_leads','all_leads','full_inbox'));
-- Migra dados existentes: only_leads_access=true → assigned_leads_only, false → full_inbox
UPDATE public.whatsapp_session_access
   SET access_mode = CASE WHEN only_leads_access THEN 'assigned_leads_only' ELSE 'full_inbox' END;
```

**SQL 5 — Função helper de visibilidade**
```sql
CREATE OR REPLACE FUNCTION public.can_view_whatsapp_conversation(_conv_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM whatsapp_conversations c
    JOIN whatsapp_sessions s ON s.id = c.session_id
    LEFT JOIN whatsapp_session_access wsa
      ON wsa.session_id = c.session_id AND wsa.user_id = auth.uid()
    WHERE c.id = _conv_id
      AND (
        is_super_admin()
        OR s.owner_user_id = auth.uid()
        OR (
          wsa.user_id IS NOT NULL AND COALESCE(wsa.can_view, true) AND (
            wsa.access_mode = 'full_inbox'
            OR (wsa.access_mode = 'all_leads' AND c.lead_id IS NOT NULL)
            OR (wsa.access_mode = 'team_leads' AND c.lead_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM leads l
                  JOIN team_members tm_self ON tm_self.user_id = auth.uid()
                  JOIN team_members tm_lead ON tm_lead.team_id = tm_self.team_id AND tm_lead.user_id = l.assigned_user_id
                  WHERE l.id = c.lead_id
                ))
            OR (wsa.access_mode = 'assigned_leads_only' AND c.lead_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM leads l WHERE l.id = c.lead_id AND l.assigned_user_id = auth.uid()
                ))
          )
        )
      )
  );
$$;
```

**SQL 6 — Consolidar policies de SELECT (REMOVE as policies antigas pra não fazer OR)**
```sql
-- conversations
DROP POLICY IF EXISTS conversations_select ON public.whatsapp_conversations;
DROP POLICY IF EXISTS conversations_privacy_policy ON public.whatsapp_conversations;
CREATE POLICY conversations_select ON public.whatsapp_conversations
  FOR SELECT USING (public.can_view_whatsapp_conversation(id));

-- messages: usa o conversation_id
DROP POLICY IF EXISTS messages_select ON public.whatsapp_messages;
CREATE POLICY messages_select ON public.whatsapp_messages
  FOR SELECT USING (public.can_view_whatsapp_conversation(conversation_id));

-- update/delete: continuam pelo can_access_whatsapp_session (admin/owner),
-- mas adicionamos verificação por lead atribuído
DROP POLICY IF EXISTS conversations_update ON public.whatsapp_conversations;
CREATE POLICY conversations_update ON public.whatsapp_conversations
  FOR UPDATE USING (public.can_view_whatsapp_conversation(id));
DROP POLICY IF EXISTS messages_update ON public.whatsapp_messages;
CREATE POLICY messages_update ON public.whatsapp_messages
  FOR UPDATE USING (public.can_view_whatsapp_conversation(conversation_id));
```

**SQL 7 — Limpeza do booleano legado (opcional, após validação)**
```sql
ALTER TABLE public.whatsapp_session_access DROP COLUMN IF EXISTS only_leads_access;
```

---

### Fase 2 — Edge function: identificação + criação + distribuição

Refatorar `supabase/functions/evolution-webhook/index.ts` no handler de `messages.upsert` para inbound (`fromMe=false`) **sem lead associado**:

1. Extrair contexto:
   - `contextInfo.externalAdReply` → `meta_campaign_id`, `meta_ad_id`, `meta_click_id`, `source_label = 'meta_ctwa'`.
   - `message.text` → casar com `whatsapp_inbound_rules` (priority asc), suportando `contains/equals/regex/utm/meta_ctwa/any`.
   - `pushName`, `phone` → fallback.
2. Aplicar primeira regra que casar:
   - Criar `lead` (org, pipeline/stage do round_robin ou da regra, `source`, `utm_*`, `meta_*`, `initial_message`, `source_session_id`).
   - Vincular `whatsapp_conversations.lead_id`.
   - Atribuir via prioridade: `target_user_id` > `target_round_robin_id` (invocar `assign-from-round-robin` que já existe) > `target_team_id` (round robin do time) > fila não distribuída.
   - Inserir `lead_assignment_history` e `whatsapp_inbound_logs`.
3. Disparar `automation-trigger` com evento `lead_created`/`conversation_assigned` (já existe).
4. Se nenhuma regra casar e `default_pool_round_robin_id` da org estiver setado, usar; senão, deixar conversa "não distribuída".

Criar nova edge function leve `whatsapp-inbound-classify` chamável standalone (útil para "reprocessar" conversa via UI).

---

### Fase 3 — Frontend

**Configurações > WhatsApp > Acessos**
- Trocar checkbox "Apenas Leads" por select com 4 modos (`assigned_leads_only`/`team_leads`/`all_leads`/`full_inbox`) + descrição.

**Configurações > WhatsApp > Regras de Entrada (nova tela)**
- CRUD de `whatsapp_inbound_rules` (drag-and-drop pra ordenar `priority`).
- Campos: nome, sessão (ou todas), match_type, match_value, match_field, alvo (RR/equipe/usuário), pipeline/estágio, source/campaign labels. Toggle ativo.

**Conversas (módulo Chat)**
- Atualizar `useAccessibleSessions` e `use-whatsapp-conversations`: a RLS já filtra, mas adicionar abas de filtro:
  - "Meus leads" (`leads.assigned_user_id = me`)
  - "Minha equipe" (via `team_members`)
  - "Não distribuídos" (admin/leader: `lead_id IS NULL`)
  - "Todas" (apenas admin/owner)
- Cards: badge de campanha (`utm_campaign`/`meta_campaign_id`), avatar do `assigned_user`, status (`Aguardando`/`Distribuído`/`Sem dono`), tempo sem resposta. Componente novo `<ConversationCardMeta>`.
- Esconder ações de "iniciar conversa nova" pra quem não é dono/admin (não bate com modelo de "só responde leads atribuídos").

**Auditoria**
- Tela admin lendo `whatsapp_inbound_logs` + filtro por regra/lead/usuário.

---

### Fase 4 — Compatibilidade & migração de dados

- Após SQL 4: usuários já compartilhados ficam em `assigned_leads_only` (mais restritivo). Avisar admin antes de aplicar.
- Conversas já existentes sem `lead_id` permanecem visíveis somente em `full_inbox` (admin/owner). Adicionar botão "Vincular a lead existente / criar lead" na UI pra resolver caso a caso.
- `evolution-webhook` continua criando conversas mesmo sem casamento; só não auto-cria lead — fica "não distribuída".

---

### Detalhes técnicos importantes

- **Performance:** `can_view_whatsapp_conversation` é `STABLE SECURITY DEFINER`. Postgres consegue inlinar bem. Adicionar `CREATE INDEX IF NOT EXISTS idx_conv_lead ON whatsapp_conversations(lead_id);` e `idx_wsa_user ON whatsapp_session_access(user_id);`.
- **Service role:** edge functions continuam bypassando RLS via service role para escrever leads/mensagens/automação.
- **Realtime:** o canal `whatsapp-realtime-bus` filtra por organização; a RLS aplicada no `subscribe` cuida do resto sem mudança de código.
- **Não quebrar:** `can_access_whatsapp_session` continua usado em INSERT/DELETE (admin/owner ainda mandam mensagens em qualquer conversa). Só SELECT/UPDATE muda.
- **Meta oficial (Fase 9 do briefing):** o schema do SQL 1 + regras `meta_ctwa` já preparam o terreno. Quando o webhook Meta vier, basta um novo handler que cria lead chamando o mesmo serviço de distribuição.

---

### Ordem de execução

1. Rodar SQL 1 → 6 no Supabase (SQL 7 só depois de validação).
2. Deploy `evolution-webhook` refatorado.
3. UI: tela de Regras + select de modo de acesso + filtros de conversa.
4. Auditoria + reprocessamento.
5. SQL 7 (drop coluna legada) após 1 semana de uso estável.

### Pontos que pedem confirmação antes de codar

- Confirma que o modo padrão para acessos compartilhados existentes deve ser **`assigned_leads_only`** (mais restritivo) e não `team_leads`?
- Quer que "líder de equipe" tenha visibilidade automática de toda a equipe mesmo com `assigned_leads_only`, ou só quem estiver em `team_leads`?
- A tela de Regras deve ficar dentro de **Configurações > WhatsApp** ou em **Gestão > Distribuição** (junto dos round robins)?