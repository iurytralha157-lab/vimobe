
# 🗺️ MAPA MENTAL COMPLETO DO VIMOB CRM

## 📋 Sumário Executivo

Este documento apresenta uma auditoria completa da arquitetura do sistema Vimob CRM, incluindo todos os fluxos de dados, controle de acesso, tabelas do banco de dados, políticas RLS e caminhos de navegação para cada tipo de usuário.

---

## 🔐 1. SISTEMA DE AUTENTICAÇÃO

### 1.1 Fluxo de Login

```text
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  /auth      │────▶│ Supabase     │────▶│ AuthContext    │
│  (Login)    │     │ auth.users   │     │ (React)        │
└─────────────┘     └──────────────┘     └────────────────┘
                                                │
                    ┌───────────────────────────┘
                    ▼
        ┌───────────────────────┐
        │ Busca profile em      │
        │ public.users          │
        │ (id = auth.uid())     │
        └───────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│ Verifica      │      │ Carrega       │
│ user_roles    │      │ organization  │
│ (super_admin?)│      │ (org_id)      │
└───────────────┘      └───────────────┘
```

### 1.2 Hierarquia de Papéis

| Papel | Código | Acesso | Descrição |
|-------|--------|--------|-----------|
| **Super Admin** | `super_admin` | Global | Acesso total a todas organizações |
| **Admin** | `admin` | Organização | Acesso total à sua organização |
| **User/Broker** | `user` | Limitado | Vê apenas leads atribuídos a ele |

### 1.3 Tabelas de Autenticação

**`auth.users`** (Supabase)
- Gerenciado pelo Supabase Auth
- Contém email, password_hash, tokens

**`public.users`** (Aplicação)
```
id              UUID (= auth.uid())
email           TEXT
name            TEXT
role            TEXT ('admin', 'user', 'super_admin')
organization_id UUID → organizations.id (NULL para super_admin)
is_active       BOOLEAN
avatar_url      TEXT
phone           TEXT
created_at      TIMESTAMP
```

**`user_roles`** (Papéis do Sistema)
```
id       UUID
user_id  UUID → auth.users.id
role     app_role ENUM ('admin', 'user', 'super_admin')
```

---

## 🏢 2. ESTRUTURA ORGANIZACIONAL

### 2.1 Organizações

**`organizations`**
```
id                  UUID
name                TEXT
segment             TEXT ('imobiliario', 'telecom', 'servicos')
logo_url            TEXT
is_active           BOOLEAN
subscription_status TEXT ('trial', 'active', 'suspended')
max_users           INTEGER
created_at          TIMESTAMP
```

### 2.2 Módulos por Organização

**`organization_modules`**
```
id              UUID
organization_id UUID → organizations.id
module_name     TEXT
is_enabled      BOOLEAN
```

**Módulos Disponíveis:**
| Módulo | Descrição | Padrão |
|--------|-----------|--------|
| crm | Pipeline e Contatos | ✅ Ativo |
| financial | Módulo Financeiro | ✅ Ativo |
| properties | Imóveis (Imobiliário) | ✅ Ativo |
| plans | Planos (Telecom) | Conforme segmento |
| coverage | Áreas de Cobertura | Conforme segmento |
| telecom | Clientes Telecom | Conforme segmento |
| whatsapp | Conversas WhatsApp | ✅ Ativo |
| agenda | Agenda/Calendário | ✅ Ativo |
| automations | Automações | ❌ Desativado |
| performance | Desempenho | ❌ Desativado |
| site | Site Integrado | ❌ Desativado |
| webhooks | Webhooks | ❌ Desativado |

---

## 🛡️ 3. SISTEMA DE PERMISSÕES RBAC

### 3.1 Estrutura de Funções Personalizadas

```text
organization_roles          Funções criadas pela organização
        │                   (ex: "Backoffice", "Gerente", "SDR")
        │
        ▼
organization_role_permissions    Permissões atribuídas à função
        │                        (ex: 'lead_view_all', 'lead_edit_all')
        │
        ▼
user_organization_roles     Usuário vinculado à função
        │
        ▼
available_permissions       24 permissões disponíveis
```

### 3.2 Categorias de Permissões

**Módulos (modules)**
| Chave | Nome | Descrição |
|-------|------|-----------|
| module_crm | CRM | Acesso ao módulo de leads |
| module_financial | Financeiro | Acesso ao financeiro |
| module_reports | Relatórios | Acesso a relatórios |

**Leads (leads)**
| Chave | Nome | Descrição |
|-------|------|-----------|
| lead_view_all | Ver Todos Leads | Visualiza leads de todos |
| lead_view_team | Ver Leads Equipe | Visualiza leads da equipe |
| lead_edit_all | Editar Todos | Pode editar qualquer lead |
| lead_delete | Excluir Leads | Pode excluir leads |

**Dados (data)**
| Chave | Nome | Descrição |
|-------|------|-----------|
| data_export | Exportar Dados | Pode exportar relatórios |
| data_import | Importar Dados | Pode importar contatos |

**Configurações (settings)**
| Chave | Nome | Descrição |
|-------|------|-----------|
| settings_users | Gerenciar Usuários | CRUD de usuários |
| settings_pipelines | Gerenciar Pipelines | CRUD de pipelines |
| settings_teams | Gerenciar Equipes | CRUD de equipes |

### 3.3 Verificação de Permissões

**Frontend: `useUserPermissions` / `useHasPermission`**
```typescript
const { hasPermission } = useUserPermissions();
if (hasPermission('lead_view_all')) {
  // Mostrar todos os leads
}
```

**Backend: `user_has_permission(p_permission_key, p_user_id)`**
```sql
SELECT public.user_has_permission('lead_view_all', auth.uid());
-- Retorna TRUE/FALSE
```

**Hierarquia de bypass:**
1. Super Admin → Sempre TRUE
2. Admin → Sempre TRUE
3. Usuário → Verifica em organization_role_permissions

---

## 📊 4. PIPELINES E LEADS

### 4.1 Estrutura de Pipeline

```text
pipelines
    │
    ├── stages (ordenados por position)
    │       │
    │       └── stage_automations
    │               └── Ações automáticas ao entrar no estágio
    │
    └── leads
            ├── lead_tags
            ├── lead_tasks
            ├── activities (histórico)
            └── lead_meta (dados Meta Ads)
```

### 4.2 Tabela `leads`

```
id                  UUID
name                TEXT (obrigatório)
phone               TEXT
email               TEXT
source              TEXT ('manual', 'whatsapp', 'webhook', 'meta_ads'...)
deal_status         TEXT ('open', 'won', 'lost')
stage_id            UUID → stages.id
pipeline_id         UUID → pipelines.id
assigned_user_id    UUID → users.id
organization_id     UUID → organizations.id
created_at          TIMESTAMP
assigned_at         TIMESTAMP (quando foi atribuído)
stage_entered_at    TIMESTAMP (quando entrou no estágio)
first_touch_at      TIMESTAMP (primeiro contato WhatsApp)
won_at              TIMESTAMP
lost_at             TIMESTAMP
redistribution_count INTEGER (quantas vezes foi redistribuído)
```

### 4.3 Visibilidade de Leads (RLS)

```text
┌─────────────────────────────────────────────────────────┐
│                    QUEM VÊ O QUÊ?                       │
├─────────────────────────────────────────────────────────┤
│ Super Admin    → Todos os leads de todas organizações  │
│ Admin          → Todos os leads da sua organização     │
│ User + lead_view_all → Todos os leads da organização   │
│ User + lead_view_team → Leads da sua equipe            │
│ User (padrão)  → Apenas leads atribuídos a ele         │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Restrição por Equipe (team_pipelines)

Se uma pipeline estiver vinculada a equipes na tabela `team_pipelines`:
- Apenas membros dessas equipes veem os leads
- Pipelines sem vínculo são acessíveis a todos

---

## 🔄 5. DISTRIBUIÇÃO ROUND ROBIN

### 5.1 Fluxo de Distribuição

```text
Lead Entra (webhook/whatsapp/meta)
        │
        ▼
┌───────────────────────┐
│ pick_round_robin_for_ │
│ lead(lead_id)         │
│ Avalia regras por     │
│ prioridade            │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ handle_lead_intake()  │
│ Seleciona próximo     │
│ membro disponível     │
└───────────────────────┘
        │
        ├─── Verifica disponibilidade (member_availability)
        ├─── Rotaciona índice (last_assigned_index)
        │
        ▼
┌───────────────────────┐
│ Atribui lead ao       │
│ usuário selecionado   │
│ + Move para pipeline/ │
│   stage de destino    │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Registra em           │
│ assignments_log       │
└───────────────────────┘
```

### 5.2 Critérios de Match (round_robin_rules)

```json
{
  "source": ["webhook", "whatsapp"],
  "webhook_id": ["uuid-do-webhook"],
  "whatsapp_session_id": ["uuid-da-sessao"],
  "meta_form_id": ["id-do-formulario"],
  "campaign_name_contains": "Black Friday",
  "tag_in": ["quente", "priority"],
  "city_in": ["São Paulo", "Campinas"],
  "website_category": ["venda", "locacao"],
  "schedule": {
    "days": [1, 2, 3, 4, 5],
    "start": "09:00",
    "end": "18:00"
  }
}
```

### 5.3 Bolsão (Pool)

Configuração em `pipelines`:
- `pool_enabled`: Ativa redistribuição automática
- `pool_timeout_minutes`: Tempo sem interação para redistribuir
- `pool_max_redistributions`: Limite de redistribuições

---

## 💬 6. INTEGRAÇÃO WHATSAPP

### 6.1 Estrutura de Acesso

```text
whatsapp_sessions
        │
        ├── owner_user_id (quem criou a sessão)
        │
        └── whatsapp_session_access
                │
                └── user_id + can_view = TRUE
                    (acesso explícito)
```

### 6.2 Regras de Visibilidade

| Usuário | Vê Sessão? |
|---------|------------|
| Owner da sessão | ✅ Sempre |
| Com acesso em session_access | ✅ Sim |
| Admin SEM acesso explícito | ❌ Não |
| Outro usuário | ❌ Não |

### 6.3 Vinculação Lead ↔ Conversa

```text
whatsapp_conversations.lead_id → leads.id
        │
        └── Vinculação automática por telefone normalizado
            (função normalize_phone())
```

---

## 💰 7. MÓDULO FINANCEIRO

### 7.1 Estrutura

```text
financial_entries          Contas a pagar/receber
        │
        └── financial_categories

contracts                  Contratos de venda
        │
        ├── leads.id
        ├── properties.id
        │
        └── commissions    Comissões dos corretores
                │
                └── users.id (corretor)
```

### 7.2 Acesso

- **Apenas Admin** pode acessar `/financeiro/*`
- Protegido por `AdminRoute` no frontend
- RLS no backend filtra por organization_id

---

## 🚀 8. EDGE FUNCTIONS

### 8.1 Funções Principais

| Função | Descrição | Trigger |
|--------|-----------|---------|
| `create-organization-admin` | Cria org + admin | Super Admin |
| `create-user` | Cria novo usuário | Admin |
| `delete-user` | Remove usuário | Admin |
| `delete-organization` | Remove org completa | Super Admin |
| `generic-webhook` | Recebe leads externos | HTTP POST |
| `evolution-webhook` | Processa WhatsApp | Evolution API |
| `meta-webhook` | Processa Meta Ads | Facebook |
| `automation-trigger` | Inicia automação | Trigger |
| `pool-checker` | Redistribui inativos | Cron |
| `handle_lead_intake` | RPC Round Robin | Interno |

---

## 🗺️ 9. ROTAS E NAVEGAÇÃO

### 9.1 Mapa de Rotas

```text
/auth                    ← Pública (login/signup)
/onboarding              ← Usuário sem organização

/dashboard               ← ProtectedRoute
/crm/pipelines           ← ProtectedRoute
/crm/contacts            ← ProtectedRoute
/crm/conversas           ← ProtectedRoute
/agenda                  ← ProtectedRoute
/properties              ← ProtectedRoute (se módulo ativo)
/plans                   ← ProtectedRoute (telecom)
/coverage                ← ProtectedRoute (telecom)
/telecom/customers       ← ProtectedRoute (telecom)
/settings                ← ProtectedRoute

/crm/management          ← AdminRoute (Gestão CRM)
/financeiro/*            ← AdminRoute
/automations             ← AdminRoute
/settings/site           ← AdminRoute + módulo 'site'

/admin                   ← SuperAdminRoute
/admin/organizations     ← SuperAdminRoute
/admin/users             ← SuperAdminRoute
/admin/settings          ← SuperAdminRoute
```

### 9.2 Fluxo por Tipo de Usuário

**Super Admin:**
```text
Login → /admin → Pode impersonate organização
        │
        └── Durante impersonate:
            → Vê sistema como Admin daquela org
            → Banner "Voltar ao Painel Admin"
```

**Admin:**
```text
Login → /dashboard → Acesso total à organização
        │
        ├── /crm/management (equipes, distribuição)
        ├── /financeiro/* (contas, contratos)
        ├── /automations
        └── /settings (usuários, webhooks, funções)
```

**Broker/User:**
```text
Login → /dashboard → Vê KPIs dos SEUS leads
        │
        ├── /crm/pipelines → Vê SEUS leads no Kanban
        ├── /crm/contacts → Lista SEUS contatos
        ├── /crm/conversas → WhatsApp (apenas sessões com acesso)
        └── /agenda → Suas tarefas
```

---

## 🔒 10. POLÍTICAS RLS PRINCIPAIS

### 10.1 Tabela `leads`

```sql
-- SELECT para usuários
leads.organization_id = get_user_organization_id()
AND (
    is_admin() 
    OR user_has_permission('lead_view_all')
    OR leads.assigned_user_id = auth.uid()
)

-- INSERT
organization_id é forçado pelo trigger enforce_organization_id()

-- UPDATE
Mesma lógica do SELECT
```

### 10.2 Tabela `users`

```sql
-- SELECT
users.organization_id = get_user_organization_id()
OR is_super_admin()

-- UPDATE
(id = auth.uid())  -- próprio perfil
OR (is_admin() AND users.organization_id = get_user_organization_id())
```

### 10.3 Tabela `whatsapp_conversations`

```sql
-- SELECT
EXISTS (
    SELECT 1 FROM whatsapp_sessions ws
    WHERE ws.id = conversation.session_id
    AND ws.organization_id = get_user_organization_id()
    AND (
        ws.owner_user_id = auth.uid()
        OR user_has_session_access(ws.id)
    )
)
```

---

## 📦 11. FUNÇÕES SQL CRÍTICAS

| Função | Propósito |
|--------|-----------|
| `is_super_admin()` | Verifica se é super admin |
| `is_admin()` | Verifica se é admin da org |
| `get_user_organization_id()` | Retorna org_id do usuário atual |
| `user_has_permission(key)` | Verifica permissão RBAC |
| `user_has_session_access(session_id)` | Verifica acesso WhatsApp |
| `normalize_phone(phone)` | Normaliza telefone (+55...) |
| `handle_lead_intake(lead_id)` | Distribui lead via round robin |
| `pick_round_robin_for_lead(lead_id)` | Encontra fila correta |
| `is_member_available(user_id)` | Verifica escala de disponibilidade |

---

## 🔄 12. TRIGGERS AUTOMÁTICOS

| Trigger | Tabela | Evento | Ação |
|---------|--------|--------|------|
| `enforce_organization_id` | leads | INSERT | Define org_id automaticamente |
| `log_lead_activity` | leads | UPDATE | Registra mudanças em activities |
| `execute_stage_automations` | leads | UPDATE | Executa automações de estágio |
| `notify_new_lead` | leads | INSERT | Notifica usuário atribuído |
| `notify_lead_first_assignment` | leads | UPDATE | Notifica admins + responsável |
| `notify_lead_assigned` | leads | UPDATE | Notifica transferência |
| `notify_stage_change` | leads | UPDATE | Notifica quando ganho |
| `sync_user_roles` | users | INSERT/UPDATE | Sincroniza com user_roles |
| `handle_deal_status_change` | leads | UPDATE | Define won_at/lost_at |

---

## 📊 13. DIAGRAMA DE RELACIONAMENTOS

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  organizations ◄─────────────────────────────────────────┐          │
│       │                                                   │          │
│       ├─── users ◄─── user_roles                         │          │
│       │      │                                            │          │
│       │      └─── user_organization_roles ───► organization_roles   │
│       │                                              │               │
│       │                                              └─► permissions │
│       │                                                              │
│       ├─── teams ◄─── team_members ◄─── member_availability         │
│       │      │                                                       │
│       │      └─── team_pipelines ──────┐                            │
│       │                                │                             │
│       ├─── pipelines ◄─────────────────┘                            │
│       │      │                                                       │
│       │      └─── stages ◄─── stage_automations                     │
│       │             │                                                │
│       ├─── leads ───┴──────────────────────────────────────────────┐│
│       │      │                                                      ││
│       │      ├─── lead_tags ───► tags                              ││
│       │      ├─── lead_tasks                                        ││
│       │      ├─── lead_meta                                         ││
│       │      ├─── activities                                        ││
│       │      └─── notifications                                     ││
│       │                                                              │
│       ├─── round_robins ◄─── round_robin_members                    │
│       │      │                                                       │
│       │      └─── round_robin_rules                                 │
│       │                                                              │
│       ├─── whatsapp_sessions ◄─── whatsapp_session_access          │
│       │      │                                                       │
│       │      └─── whatsapp_conversations ───► whatsapp_messages    │
│       │                                                              │
│       ├─── properties (imobiliário)                                 │
│       │      │                                                       │
│       │      └─── contracts ───► commissions                        │
│       │                                                              │
│       ├─── service_plans (telecom)                                  │
│       │      │                                                       │
│       │      └─── telecom_customers ───► telecom_billing           │
│       │                                                              │
│       └─── financial_entries ───► financial_categories             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ 14. CHECKLIST DE SEGURANÇA

| Área | Status | Descrição |
|------|--------|-----------|
| RLS em leads | ✅ | Filtro por org + assigned_user |
| RLS em users | ✅ | Filtro por organização |
| RLS em financial | ✅ | Apenas org + admin |
| RLS em whatsapp | ✅ | Owner + session_access |
| Super Admin bypass | ✅ | Via is_super_admin() |
| Impersonation | ✅ | Atualiza org_id temporariamente |
| RBAC customizado | ✅ | 24 permissões granulares |
| Team-based access | ✅ | Via team_pipelines |
| Módulos condicionais | ✅ | organization_modules |

---

Este documento serve como referência completa para auditoria e compreensão do sistema. Cada componente está mapeado com suas dependências, fluxos de dados e controles de acesso.
