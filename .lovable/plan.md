
# Auditoria Técnica — Integração Meta (Facebook / Instagram / WhatsApp)

Foco: **estabilidade da captação de leads**, mudanças incrementais, sem refatorar arquitetura, sem downtime.

---

## 1. Mapa da arquitetura atual

**Edge Functions**
- `meta-oauth` — fluxo OAuth Facebook (Pages + Lead Ads + Ads).
- `instagram-oauth` — fluxo OAuth separado para Instagram Business Login.
- `meta-webhook` — recebe `leadgen`, `messages`, `feed`, `comments` (page + instagram).
- `meta-campaign-insights`, `meta-messenger-proxy` — auxiliares.
- WhatsApp hoje é via **Evolution API** (`evolution-webhook`, `evolution-proxy`), **não Cloud API oficial**.

**Tabelas**
- `meta_integrations` (página conectada + token + pipeline default).
- `meta_form_configs` (config por form, com `is_active`, `field_mapping`, `auto_tags`, etc.).
- `meta_conversations` / `meta_messages` (DMs/comentários).
- `lead_meta` (atribuição campanha/ad/criativo).
- `leads` recebe `meta_lead_id`, `meta_form_id`.

**Fluxo OAuth atual (Facebook)**
1. Frontend chama `meta-oauth` action `get_auth_url` com `return_url`.
2. Redireciona para `facebook.com/v19.0/dialog/oauth` com escopos: `pages_show_list, pages_read_engagement, pages_manage_ads, pages_manage_metadata, leads_retrieval, ads_management, business_management`.
3. Callback GET em `meta-oauth` → troca code → long-lived user token (~60d) → lista pages + ad accounts → redireciona com payload base64 para o frontend.
4. Usuário escolhe page + pipeline + stage → action `connect_page` → faz `POST /{page_id}/subscribed_apps` com `subscribed_fields=leadgen,messages,messaging_postbacks,feed` e salva `page.access_token` (long-lived/never-expires).

**Fluxo do webhook de lead**
- `meta-webhook` valida `X-Hub-Signature-256`, busca integração ativa pela `page_id`, exige `meta_form_configs.is_active=true`, busca lead no Graph API, busca criativo, insere em `leads` + `lead_meta`, incrementa contador.

---

## 2. Achados críticos (riscos para captação de leads)

### 2.1 Causa principal da "confirmação manual" pós-login
- Não usamos **Facebook Login for Business / Embedded Signup**. Estamos no fluxo OAuth clássico, onde o usuário cai numa tela genérica de permissões e, dependendo do app, precisa entrar no Business Manager para aprovar páginas/ad accounts.
- Não passamos `config_id` (Login Configuration) — sem isso a Meta não consegue pré-empacotar o conjunto de assets (page + ad account + WABA) e o usuário precisa selecionar/aprovar manualmente.
- Não há chamada explícita para listar/verificar **System User** ou **Business assets** após o login (`/me/businesses`, `/{business_id}/owned_pages`, `/{business_id}/client_pages`).
- Escopos pedidos hoje cobrem Lead Ads, mas faltam: `pages_messaging` (para responder DMs), `pages_manage_engagement`, e — se for usar WhatsApp Cloud API — `whatsapp_business_management`, `whatsapp_business_messaging`.

### 2.2 Riscos de perda de lead
- **Sem retry/idempotência** no `meta-webhook`. Se a inserção em `leads` falhar (p.ex. RLS, constraint), o lead é perdido — Meta só reenvia em casos específicos.
- **Sem dedupe** por `meta_lead_id`: se a Meta reenviar o mesmo `leadgen_id`, vamos duplicar.
- **Webhook responde `OK` sem persistir o payload bruto primeiro**. Se o Graph API estiver fora ou o token expirar, perdemos o lead sem rastro auditável.
- **Sem fila/dead-letter**: nenhuma tabela `meta_webhook_events` para reprocessar.
- Token da página é tratado como permanente, mas pode ser invalidado (mudança de senha, remoção de admin, política de segurança da Meta). Não temos job de health-check.
- Quando `formConfig` não existe ou `is_active=false`, o lead é silenciosamente descartado — sem log persistido, sem alerta. Usuário não sabe que perdeu lead.
- `subscribe_apps` falha → apenas `console.error`; integração fica "conectada" sem webhook.

### 2.3 Token / autenticação
- User long-lived token armazenado no campo `access_token` da página, mas **page tokens derivados de long-lived user tokens já são "never-expire"** — ok. Porém não há job para **debug_token** validando `expires_at`, `is_valid`, `scopes`, `granular_scopes`.
- Sem renovação automática nem alerta antes de expirar.
- Tokens em texto puro no DB. Sem coluna `token_status`, `token_expires_at`, `last_validated_at`.

### 2.4 Webhook security
- Verificação HMAC ok, mas se `META_APP_SECRET` não estiver setado, **passa sem validar** (`if (META_APP_SECRET && !verifySignature...)`). Deve falhar fechado.
- Sem rate limit / sem proteção replay.

### 2.5 Instagram
- `instagram-oauth` usa Instagram Login (consumer) e salva em `meta_integrations` com `integration_type='instagram'`. Para Lead Ads no Instagram, o fluxo correto é via página do Facebook vinculada (já coberto pelo `meta-oauth`). Há sobreposição/confusão de fluxos.

### 2.6 WhatsApp
- Hoje 100% via Evolution API não-oficial. Não há integração com **WhatsApp Cloud API** da Meta. Fora de escopo desta auditoria, mas relevante: se quiser WhatsApp oficial via Embedded Signup, precisa do `whatsapp_business_management`.

### 2.7 App Review / permissões
- Escopos `leads_retrieval`, `ads_management`, `business_management`, `pages_manage_ads` exigem **Advanced Access** (App Review aprovado). Em Standard Access, só funciona para usuários listados no app → causa falha "silenciosa" para clientes finais.
- Sem verificação no app de que está em Live Mode.

### 2.8 Versão da Graph API
- Estamos em `v19.0`. Atual estável é `v21.0`/`v22.0`. `v19.0` ainda funciona mas sai de suporte. Risco de quebra futura.

### 2.9 Banco / migrations
- `meta_integrations` não tem unique index garantido em `(organization_id, page_id)` visível nas migrations recentes — `onConflict` depende disso. Validar.
- Sem coluna `webhook_subscribed_at`, `webhook_fields`, `last_webhook_event_at`.

---

## 3. Plano em fases (incremental, sem refatoração)

> Cada fase é independente, deployável isolada, com rollback simples.

### FASE 1 — Correções críticas sem risco (dias)

**Objetivo:** parar perda silenciosa de leads e fechar buracos de segurança.

| Item | Mudança | Risco |
|---|---|---|
| 1.1 | `meta-webhook`: persistir **payload bruto** em nova tabela `meta_webhook_events` ANTES de processar. Status = received/processed/failed/skipped + `error_message`. | baixo |
| 1.2 | `meta-webhook`: dedupe por `meta_lead_id` (UNIQUE em `leads.meta_lead_id` parcial onde não nulo). | baixo |
| 1.3 | `meta-webhook`: HMAC obrigatório — se `META_APP_SECRET` ausente, retornar 500 e logar. | nulo |
| 1.4 | `meta-webhook`: try/catch por entry; nunca retornar 500 ao Meta após persistir o evento (retorna 200 sempre que payload foi salvo) — evita reentrega infinita. | baixo |
| 1.5 | `meta-oauth` `connect_page`: se `subscribed_apps` falhar, **não marcar `is_connected=true`** e retornar erro claro. | baixo (UX melhor) |
| 1.6 | UI: aviso quando lead chega para form sem `meta_form_configs` ativo (banner em Settings/Meta + badge "X leads ignorados"). | nulo |

**Tabelas afetadas:** nova `meta_webhook_events`; `leads` (índice).
**Edge functions:** `meta-webhook`, `meta-oauth`.
**Frontend:** `MetaIntegrationSettings.tsx` (banner alertas).
**Rollback:** `DROP TABLE meta_webhook_events`; reverter funções.

SQL fase 1:
```sql
CREATE TABLE IF NOT EXISTS public.meta_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  object text,
  page_id text,
  leadgen_id text,
  form_id text,
  signature_valid boolean,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  processed_at timestamptz,
  organization_id uuid,
  raw_payload jsonb NOT NULL
);
CREATE INDEX ON public.meta_webhook_events (page_id, received_at DESC);
CREATE INDEX ON public.meta_webhook_events (status, received_at DESC);
ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;
-- policies: somente service role + super admin

CREATE UNIQUE INDEX IF NOT EXISTS leads_meta_lead_id_uq
  ON public.leads (meta_lead_id) WHERE meta_lead_id IS NOT NULL;
```

---

### FASE 2 — Estabilidade da captura (1 semana)

**Objetivo:** reprocessamento automático e visibilidade.

| Item | Mudança |
|---|---|
| 2.1 | Edge function nova `meta-webhook-replay` (cron 5min) que pega `meta_webhook_events.status='failed'` (até N tentativas) e reprocessa. |
| 2.2 | Coluna `attempts` + `next_retry_at` em `meta_webhook_events`. |
| 2.3 | Tela "Histórico de Webhooks Meta" em Settings → Integrações → Meta (somente admin), com filtro por status e botão "Reprocessar". |
| 2.4 | Alerta interno (notificação) quando `failed > 0` nas últimas 24h. |
| 2.5 | Job diário `meta-token-healthcheck` chamando `/debug_token` para cada `meta_integrations`. Atualiza `token_status`, `token_expires_at`, `last_validated_at`. Marca `is_connected=false` apenas se token claramente inválido + cria notificação. |

**Risco:** baixo, tudo em paralelo ao fluxo atual.

---

### FASE 3 — Automação completa do onboarding (1–2 semanas)

**Objetivo:** eliminar passos manuais pós-login.

| Item | Mudança |
|---|---|
| 3.1 | Migrar `get_auth_url` para **Facebook Login for Business** com `config_id` (criar Login Configuration no painel da Meta App contendo Pages + Ads + Lead Ads + opcionalmente WhatsApp). Adicionar parâmetros `config_id` e `extras={"setup":{...}}`. |
| 3.2 | Após callback, chamar automaticamente: `/me/businesses`, `/{business}/owned_pages`, `/{business}/client_pages`, `/{business}/owned_ad_accounts`. Pré-selecionar tudo e fazer `subscribed_apps` para todas as páginas escolhidas em batch. |
| 3.3 | Remover dependência da segunda tela de "selecionar página + pipeline" tornando-a opcional (default pipeline aplica-se a todas). Usuário só confirma. |
| 3.4 | Atualizar Graph API para `v21.0` em todas as functions Meta (uma única migration de string). |
| 3.5 | Incluir escopos extras só se já aprovados em App Review: `pages_messaging`. |

**Pré-requisito externo:** App em Live Mode com Advanced Access em `leads_retrieval`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`. Documentar no Help.

**Risco:** médio — manter rota antiga (`get_auth_url_legacy`) como fallback feature-flag por organização durante 2 semanas.

---

### FASE 4 — Monitoramento e recuperação (1 semana)

| Item | Mudança |
|---|---|
| 4.1 | Dashboard interno (Super Admin): leads recebidos / falhas / tokens próximos de expirar / páginas sem webhook nos últimos 7d. |
| 4.2 | Notificação WhatsApp/email para o admin da org quando: token inválido, webhook não recebe nada por 48h em página com histórico, form ativo recebendo leads sem `meta_form_configs`. |
| 4.3 | Endpoint `meta-resync` que: re-assina webhook, valida token, busca leads das últimas 24h via `/{form_id}/leads` (recuperação manual). |
| 4.4 | Logs estruturados (JSON) em `meta-webhook` e `meta-oauth`. |

---

### FASE 5 — Escalabilidade futura (backlog)

- Migrar tokens para Vault/criptografia at-rest.
- Embedded Signup completo de WhatsApp Cloud API substituindo Evolution para clientes que pedirem oficial.
- Particionar `meta_webhook_events` por mês.
- Webhook por região (multi-edge) caso volume aumente.
- Suporte a múltiplas Meta Apps por white-label.

---

## 4. Detalhes técnicos consolidados

**Versionamento Graph API:** `v19.0 → v21.0` (uma constante única no topo de cada function).

**Escopos recomendados (após App Review):**
```
pages_show_list, pages_read_engagement, pages_manage_metadata,
pages_manage_ads, pages_messaging, leads_retrieval,
ads_management, business_management,
public_profile, email
```
(Adicionar `whatsapp_business_management`, `whatsapp_business_messaging` apenas se ativar Cloud API).

**Endpoints novos a usar:**
- `GET /debug_token?input_token=…&access_token={app_id}|{app_secret}` — health do token.
- `GET /me/businesses` + `/{business_id}/owned_pages` + `client_pages` + `owned_ad_accounts` — descoberta automática de assets.
- `POST /{page_id}/subscribed_apps` com `subscribed_fields` — já usamos.
- `GET /{form_id}/leads?fields=…&since=…` — replay de leads perdidos.

**Estratégia de rollback geral:** cada fase entrega behind feature flag `meta_v2_*` por organização (default off na fase 3). Reverter = desligar flag, sem migração reversa necessária exceto drop de tabelas auxiliares (idempotente).

**Compatibilidade produção:** nenhuma fase altera tabelas existentes de forma destrutiva. Apenas:
- `leads`: adiciona índice único parcial (não bloqueia inserts existentes — validar duplicatas antes com query e limpar).
- `meta_integrations`: adiciona colunas `token_status`, `token_expires_at`, `last_validated_at`, `webhook_subscribed_at` (nullable).
- Novas tabelas: `meta_webhook_events`.

---

## 5. Próximo passo sugerido

Aprovar **somente FASE 1** primeiro (risco mínimo, ganho imediato em rastreabilidade e dedupe). Após validar 48h em produção, avançar para FASE 2.

Quer que eu prepare os SQL/migrations e código da FASE 1 já?
