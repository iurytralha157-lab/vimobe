# Refatoração SuperAdmin + Onboarding + Aprovação

Execução **fase por fase**. Cada fase entrega UI + backend + SQLs prontos (quando houver) e só avançamos após sua validação.

Identidade visual: SF Pro Display, primário `#ff482a`, fundo `#1f1f1f`, `rounded-2xl`, grids fluidos `repeat(auto-fit, minmax(320px, 1fr))`, skeletons, micro-animações. Zero tokens custom novos — reaproveita o design system existente.

---

## Fase 1 — Dashboard SuperAdmin (centro de inteligência)

**Arquivo principal:** `src/pages/admin/AdminDashboard.tsx` (reescrito).

**Novos componentes** em `src/components/admin/dashboard/`:
- `PlatformHeader` — título, subtítulo dinâmico (pendências/inadimplência/crescimento), seletor de período (7/30/90d/YTD), botão atualizar, last-sync.
- `KpiCard` — ícone, valor, delta %, sparkline, descrição.
- `KpiGrid` — grupos Financeiro / Plataforma / Operacional.
- `RevenueChart`, `OrgsGrowthChart`, `HealthDonutChart`, `UsageChart` — Recharts com tema da plataforma.
- `PendingBoard` — 4 boards: inadimplentes, sem uso, problemas técnicos, trials vencendo.
- `OperationalFeed` — timeline realtime com filtros (tipo/severidade).

**Backend (SQL — Fase 1):** views materializadas + RPCs agregando dados que hoje não estão prontos:
- `mv_platform_mrr_daily` (entradas pagas por dia × org).
- `mv_platform_org_health` (status, último login, dias sem uso, leads/30d).
- `mv_platform_usage_daily` (leads, logins, automações executadas, erros).
- `v_platform_overdue_orgs` (inadimplência via `financial_entries`/Asaas).
- `v_platform_trials_expiring` (dias restantes).
- RPC `admin_dashboard_overview(period)` retornando KPIs em JSON único.
- RPC `admin_dashboard_pending_boards()`.
- pg_cron para refresh das MVs a cada 15 min.
- Tabela `platform_events` (append-only) alimentando o feed operacional + trigger genérico em pontos chave (org criada, pagamento aprovado, trial expirado, automação falhou).

**Performance:** React Query com `staleTime` 60s, skeletons, lazy charts.

---

## Fase 2 — Página de Organizações (cards premium)

**Arquivo principal:** `src/pages/admin/AdminOrganizations.tsx` (reescrito), inspirado na tela "Selecionar Organização".

- `OrganizationCard` novo: avatar/logo, nome imobiliária, nome interno, badge (Trial/Ativa/Suspensa/Cancelada), criado em, plano, qtd usuários, qtd leads, último pagamento.
- Ações rápidas (dropdown): acessar (personificação), editar, financeiro, suspender/reativar, métricas.
- Grid fluido `auto-fit minmax(340px, 1fr)`.
- Filtros no topo: busca, status, plano, ordenação.
- Hook novo `useAdminOrganizationsList()` agregando usuários/leads/último pagamento numa única RPC `admin_list_organizations(filters)` para evitar N+1.

**Backend (SQL — Fase 2):** RPC `admin_list_organizations` + índices auxiliares.

---

## Fase 3 — Tela de revisão do Onboarding (SuperAdmin)

Refactor visual **apenas** de `src/pages/admin/AdminOnboarding.tsx` (a página pública `/onboarding` fica como está, conforme combinado).

- Substituir a tabela atual por **lista de cards/linhas premium**: avatar, organização, responsável, plano escolhido, telefone, e-mail, data, status badge.
- **Painel lateral (Sheet ~720px)** ao clicar: dados completos do pedido (branding, módulos, integrações desejadas), ações Aprovar / Rejeitar / Solicitar ajustes.
- Filtros segmentados (Pendentes / Aprovadas / Rejeitadas) com contadores.
- Skeleton, empty state ilustrado, animações suaves.

---

## Fase 4 — Notificações internas do Onboarding

Hoje só dispara WhatsApp. Adicionar notificação interna sem mexer no WhatsApp.

- Novo trigger em `onboarding_requests` (AFTER INSERT) chamando função que insere em `notifications` para **todos os super_admins** com `type='onboarding_request'`, payload com nome, responsável, telefone, e-mail, plano, data e link `/admin/onboarding?id=...`.
- Atualizar sino de notificações (componente existente) para reconhecer o type e mostrar CTA "Revisar pedido".
- Adicionar entrada no novo `OperationalFeed` (Fase 1) via `platform_events`.

**Backend (SQL — Fase 4):** function + trigger + (opcional) realtime channel.

---

## Fase 5 — Fluxo de aprovação automática

Substituir o approve atual por uma edge function `approve-onboarding-request`:

1. Valida role `super_admin`.
2. Gera senha aleatória forte (16 chars, base64url, sem ambíguos).
3. Cria usuário em `auth.users` via Admin API (service role) com `email_confirm=true`.
4. Cria `organization`, `users` (role=admin), pipelines default, equipe default — reaproveita lógica do `useSuperAdmin.createOrganization`.
5. Marca `onboarding_requests.status='approved'`, salva `approved_by`, `approved_at`, IP do approver.
6. Insere log em `platform_events` ("Organização X aprovada").
7. Insere notificação interna ("Aprovação concluída").
8. Dispara WhatsApp (reaproveita `whatsapp-notifier`) + e-mail (Lovable Emails) com: boas-vindas, URL, login, senha temporária, recomendação de troca, contato suporte.
9. Retorna `{ email, password, login_url }` para a UI exibir em modal "Acesso gerado" com botões Copiar.

**Senha em texto plano** conforme escolhido. Sem `must_change_password` forçado nesta fase.

**Backend (SQL — Fase 5):** colunas `approved_by`, `approved_at`, `approver_ip` em `onboarding_requests` (se faltarem); índice em `status`.

---

## Padronização final
Todas as telas SuperAdmin passam a usar os mesmos tokens, mesmas badges (`StatusBadge` compartilhado), mesma tipografia, mesmos espaçamentos, mesma linguagem visual de filtros e sheets.

---

## Entregáveis SQL
Ao final de cada fase, envio **todos os SQLs** numerados e prontos para colar no SQL Editor do Supabase, na ordem correta (extensões → tabelas → índices → functions → triggers → RPCs → MVs → cron). Se algum migration não puder ser aplicado automaticamente, ele virá explicitamente listado no bloco final da resposta da fase.

---

## Ordem de execução
1. **Fase 1** — Dashboard (UI + SQLs MVs/RPCs/feed)
2. **Fase 2** — Organizações (UI + RPC)
3. **Fase 3** — Onboarding review (UI)
4. **Fase 4** — Notificações internas (trigger + sino)
5. **Fase 5** — Aprovação automática (edge function + SQLs auxiliares)

Aprove o plano e eu começo imediatamente pela **Fase 1**.