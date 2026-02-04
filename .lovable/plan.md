
# Plano: Evolução Completa do Painel Super Admin

## Resumo das Melhorias Solicitadas

Com base na análise do código atual, identifico diversas melhorias necessárias para transformar o painel Super Admin em um centro de controle completo.

---

## Diagnóstico de Problemas Atuais

### 1. Botões Desativar/Excluir Organizações
**Status:** Funcionando corretamente no código
- O botão de desativar chama `handleToggleActive` que usa `updateOrganization.mutate`
- O botão de excluir abre um dialog de confirmação e chama `deleteOrganization.mutateAsync`
- Possível problema: pode ser RLS ou falta de permissão na edge function

### 2. Comunicados
**Status:** Já implementado mas pode precisar de organização visual
- Está na aba "Configurações" mas pode não estar visível se a página for muito longa
- Funciona: barra laranja no topo + notificações

---

## Funcionalidades a Implementar

### Fase 1: Sistema de Planos SaaS para Organizações

#### Novo Menu: "Planos" no Admin
```text
/admin/plans - Gerenciar planos de assinatura
```

#### Tabela: `admin_subscription_plans`
```sql
CREATE TABLE admin_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- Ex: "Básico", "Profissional", "Enterprise"
  description TEXT,
  price NUMERIC(10,2) NOT NULL,          -- Valor mensal
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
  trial_days INTEGER DEFAULT 7,          -- Dias de trial
  max_users INTEGER DEFAULT 10,
  max_leads INTEGER,                     -- Limite de leads (null = ilimitado)
  modules TEXT[] DEFAULT '{}',           -- Módulos incluídos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Alterações na tabela `organizations`
```sql
ALTER TABLE organizations 
ADD COLUMN plan_id UUID REFERENCES admin_subscription_plans(id),
ADD COLUMN trial_ends_at TIMESTAMPTZ,     -- Data de expiração do trial
ADD COLUMN subscription_type TEXT DEFAULT 'trial' 
  CHECK (subscription_type IN ('trial', 'paid', 'free')); -- free = parceria
```

### Fase 2: Controle de Trial Automático

#### Lógica de Bloqueio
- Quando `subscription_type = 'trial'` e `trial_ends_at < now()`:
  - Usuário pode fazer login
  - Exibe modal de "Trial Expirado" com CTA para contato via WhatsApp
  - Impede navegação até regularizar

#### Edge Function: `trial-checker`
- Roda diariamente via cron
- Verifica trials expirados
- Atualiza status automaticamente
- Envia notificação para super admin

### Fase 3: Dashboard Financeiro Real

#### MRR Calculado Automaticamente
```typescript
const calculateMRR = (organizations) => {
  return organizations.reduce((total, org) => {
    if (org.subscription_type === 'paid' && org.plan) {
      return total + org.plan.price;
    }
    return total;
  }, 0);
};
```

#### Métricas Adicionais
- Total MRR (Receita Mensal Recorrente)
- Organizações por tipo (Trial, Pago, Gratuito/Parceria)
- Trials expirando esta semana
- Conversão Trial → Pago

### Fase 4: Comunicados Avançados

#### Opções Adicionais
```typescript
interface AnnouncementOptions {
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  // NOVOS CAMPOS:
  showBanner: boolean;           // Exibir barra no topo
  sendNotification: boolean;     // Enviar como notificação
  targetType: 'all' | 'organizations' | 'admins' | 'specific';
  targetIds?: string[];          // IDs específicos se targetType = 'specific'
}
```

#### Alterações na tabela `announcements`
```sql
ALTER TABLE announcements
ADD COLUMN show_banner BOOLEAN DEFAULT true,
ADD COLUMN send_notification BOOLEAN DEFAULT true,
ADD COLUMN target_type TEXT DEFAULT 'all',
ADD COLUMN target_organization_ids UUID[],
ADD COLUMN target_user_ids UUID[];
```

### Fase 5: Central de Ajuda Editável

#### Nova tabela: `help_articles`
```sql
CREATE TABLE help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,              -- Suporta Markdown
  video_url TEXT,                     -- URL do vídeo (YouTube, Vimeo)
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Interface de Edição
- Editor de texto rico para criar/editar artigos
- Upload de imagens
- Embed de vídeos do YouTube
- Organização por categorias

### Fase 6: Alertas como Notificações

#### Transformar alertas atuais em notificações do sistema
Quando detectar:
- Trial expirando em 7 dias → Notificação para super admin
- Organização inativa há 30 dias → Notificação
- Organização suspensa → Alerta visual

---

## Reorganização do Layout

### Nova Estrutura da Sidebar Admin
```text
📊 Dashboard          (atual)
🏢 Organizações       (atual)
👥 Usuários           (atual)
📋 Planos             (NOVO)
💡 Solicitações       (atual - manter)
📢 Comunicados        (NOVO - separar de configurações)
❓ Central de Ajuda   (NOVO - editor)
⚙️ Configurações      (atual - só logos/sistema)
```

### Dashboard Melhorado
```text
┌────────────────────────────────────────────────────────────┐
│  CARDS PRINCIPAIS                                          │
├───────────┬───────────┬───────────┬───────────┬───────────┤
│ Total     │ Pagas     │ Em Trial  │ Gratuitas │ MRR       │
│ Orgs      │ (ativas)  │ (7 dias)  │ (parceria)│ R$ X.XXX  │
├───────────┴───────────┴───────────┴───────────┴───────────┤
│                                                            │
│  ALERTAS (agora mais proeminentes)                        │
│  ⚠️ 3 trials expiram esta semana                           │
│  ⚠️ 2 organizações inativas há 30+ dias                    │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  GRÁFICOS                                                  │
│  [Crescimento]              [Status]                       │
│  [Receita por mês]          [Conversão Trial→Pago]        │
└────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/xxx_admin_plans.sql` | Tabela de planos + alterações em organizations |
| `supabase/migrations/xxx_announcements_advanced.sql` | Campos adicionais para comunicados |
| `supabase/migrations/xxx_help_articles.sql` | Tabela de artigos de ajuda |
| `src/pages/admin/AdminPlans.tsx` | Gerenciamento de planos SaaS |
| `src/pages/admin/AdminAnnouncements.tsx` | Comunicados avançados (separado) |
| `src/pages/admin/AdminHelpEditor.tsx` | Editor da central de ajuda |
| `src/hooks/use-admin-plans.ts` | CRUD de planos |
| `src/hooks/use-help-articles.ts` | CRUD de artigos |
| `src/components/admin/TrialExpiredModal.tsx` | Modal de trial expirado |
| `supabase/functions/trial-checker/index.ts` | Verificador automático de trials |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/AdminSidebar.tsx` | Adicionar novos menus |
| `src/pages/admin/AdminDashboard.tsx` | Métricas financeiras reais |
| `src/pages/admin/AdminSettings.tsx` | Remover comunicados (vai para página própria) |
| `src/pages/admin/AdminOrganizations.tsx` | Adicionar coluna de plano |
| `src/pages/admin/AdminOrganizationDetail.tsx` | Seção de plano/billing |
| `src/hooks/use-super-admin.ts` | Incluir dados de planos |
| `src/hooks/use-announcements.ts` | Suporte a targets |
| `src/App.tsx` | Verificação de trial expirado + novas rotas |
| `src/pages/Help.tsx` | Carregar artigos do banco |

---

## Fluxo de Trial Expirado

```text
1. Usuário faz login
2. Sistema verifica: subscription_type = 'trial' && trial_ends_at < now()
3. Se expirado:
   - Permite acesso à tela
   - Exibe modal de bloqueio:
     ┌─────────────────────────────────────┐
     │  ⏰ Seu período de teste expirou    │
     │                                     │
     │  Entre em contato para continuar    │
     │  usando o sistema.                  │
     │                                     │
     │  [💬 Falar via WhatsApp]            │
     │  (abre WhatsApp do super admin)     │
     └─────────────────────────────────────┘
   - Modal não fecha (bloqueia sistema)
```

---

## Prioridade de Implementação

1. **Crítico:** Verificar/corrigir botões desativar/excluir
2. **Alto:** Sistema de planos + trial automático
3. **Alto:** Reorganização visual do dashboard
4. **Médio:** Comunicados avançados com targets
5. **Médio:** Editor da central de ajuda
6. **Baixo:** Alertas como notificações push

---

## Considerações Técnicas

1. **Trial automático:** Usar cron do Supabase para verificar diariamente
2. **Modal de bloqueio:** Verificar no `AuthContext` após login
3. **MRR:** Calcular em tempo real baseado nos planos atribuídos
4. **Editor de ajuda:** Usar biblioteca de Markdown (react-markdown ou similar)
5. **Comunicados com targets:** Filtrar notificações no momento do envio

---

## Resumo Visual

```text
Antes:                          Depois:
├── Dashboard                   ├── Dashboard (melhorado)
├── Organizações                ├── Organizações (com planos)
├── Usuários                    ├── Usuários
├── Solicitações                ├── Planos (NOVO)
└── Configurações               ├── Solicitações
    └── (comunicados aqui)      ├── Comunicados (NOVO)
                                ├── Central de Ajuda (NOVO)
                                └── Configurações (simplificado)
```
