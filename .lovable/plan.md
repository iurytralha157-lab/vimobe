
# Plano Completo: Integração Meta Lead Ads

## Resumo Executivo

A integração Meta (Facebook/Instagram Lead Ads) precisa de **3 correções principais** para funcionar:

1. **Secrets do Facebook App** - Configurar credenciais no Supabase
2. **Migrations SQL** - Criar tabela `meta_form_configs` e adicionar colunas faltantes
3. **Configuração no Facebook Developers** - Configurar webhook e permissões

---

## Etapa 1: Secrets do Facebook App

### Secrets Necessários

| Secret | Descrição | Onde Obter |
|--------|-----------|------------|
| `META_APP_ID` | ID do aplicativo Facebook | Facebook Developers → Seu App → Painel |
| `META_APP_SECRET` | Chave secreta do app | Facebook Developers → Configurações → Básico |
| `META_WEBHOOK_VERIFY_TOKEN` | Token de verificação do webhook | Você define (qualquer string segura) |

### Status Atual
Nenhum dos 3 secrets está configurado. Os secrets existentes são:
- EVOLUTION_API_KEY/URL (WhatsApp)
- FIREBASE_SERVICE_ACCOUNT (Push)
- GOOGLE_CLIENT_ID/SECRET (Calendar)
- VAPID_PRIVATE_KEY (Web Push)

---

## Etapa 2: Migrations SQL

### 2.1 Criar Tabela `meta_form_configs`

Esta tabela permite configurar cada formulário individualmente (pipeline, tags, usuário atribuído, etc.):

```sql
CREATE TABLE public.meta_form_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES meta_integrations(id) ON DELETE CASCADE,
  form_id TEXT NOT NULL,
  form_name TEXT,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  default_status TEXT DEFAULT 'novo',
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  auto_tags JSONB DEFAULT '[]',
  field_mapping JSONB DEFAULT '{}',
  custom_fields_config JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  leads_received INTEGER DEFAULT 0,
  last_lead_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(organization_id, form_id)
);

-- RLS
ALTER TABLE public.meta_form_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org form configs"
  ON public.meta_form_configs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage form configs"
  ON public.meta_form_configs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2.2 Adicionar Colunas na Tabela `meta_integrations`

```sql
ALTER TABLE public.meta_integrations 
  ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_status TEXT DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS leads_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_lead_at TIMESTAMPTZ;

-- Adicionar constraint unique para upsert funcionar
ALTER TABLE public.meta_integrations 
  DROP CONSTRAINT IF EXISTS meta_integrations_org_page_unique;

ALTER TABLE public.meta_integrations 
  ADD CONSTRAINT meta_integrations_org_page_unique 
  UNIQUE (organization_id, page_id);
```

### 2.3 Adicionar Colunas na Tabela `leads`

```sql
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS meta_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_form_id TEXT;

-- Index para evitar leads duplicados
CREATE INDEX IF NOT EXISTS idx_leads_meta_lead_id 
  ON public.leads(meta_lead_id) 
  WHERE meta_lead_id IS NOT NULL;
```

---

## Etapa 3: Configuração no Facebook Developers

### 3.1 Criar/Configurar o App

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em "Meus Apps" → "Criar App"
3. Escolha "Negócios" como tipo
4. Nomeie o app (ex: "ViMobe Lead Ads")
5. Após criar, vá em **Configurações → Básico** e copie:
   - **ID do App** → salvar como `META_APP_ID`
   - **Chave Secreta** → salvar como `META_APP_SECRET`

### 3.2 Adicionar Produto "Webhooks"

1. No menu lateral, clique em "Adicionar Produto"
2. Localize "Webhooks" e clique "Configurar"
3. Em "Editar Assinatura", selecione "Page"
4. Configure:
   - **URL de Callback**: 
     ```
     https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-webhook
     ```
   - **Token de Verificação**: Use o mesmo valor que você salvou como `META_WEBHOOK_VERIFY_TOKEN`
5. Clique em "Verificar e Salvar"
6. Após verificar, marque a checkbox "leadgen" para ativar

### 3.3 Adicionar Produto "Facebook Login"

1. Adicione o produto "Facebook Login"
2. Em Configurações, adicione a URL de redirecionamento OAuth:
   ```
   https://vimobe.lovable.app/settings/integrations/meta
   ```
3. Salve as alterações

### 3.4 Solicitar Permissões

Para o app funcionar em produção, solicite:
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_ads`
- `leads_retrieval`
- `ads_management`
- `business_management`

Nota: Em modo de desenvolvimento, o app funciona apenas para usuários com papel de desenvolvedor/testador.

---

## Fluxo de Funcionamento

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         FLUXO META LEAD ADS                         │
└──────────────────────────────────────────────────────────────────────┘

1. CONEXÃO (uma vez)
   ┌─────────┐    OAuth    ┌──────────────┐    Token    ┌──────────────┐
   │  Admin  │ ──────────► │   Facebook   │ ──────────► │ meta-oauth   │
   │  ViMobe │             │    Login     │             │  function    │
   └─────────┘             └──────────────┘             └──────┬───────┘
                                                               │
                                                               ▼
                                                    ┌──────────────────┐
                                                    │ meta_integrations│
                                                    │ (salva token)    │
                                                    └──────────────────┘

2. RECEBIMENTO DE LEADS (automático)
   ┌──────────────┐  POST  ┌──────────────┐  INSERT  ┌──────────────┐
   │   Facebook   │ ─────► │ meta-webhook │ ───────► │    leads     │
   │   Servers    │        │   function   │          │  lead_meta   │
   └──────────────┘        └──────────────┘          └──────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Supabase Secrets | Adicionar | 3 secrets do Facebook |
| Migration SQL | Criar | Tabela `meta_form_configs` + colunas |
| `supabase/config.toml` | Limpar | Remover referência órfã ao wordpress-webhook |

---

## Resultado Esperado

Após implementar este plano:

1. O admin poderá conectar páginas do Facebook via OAuth
2. Cada formulário de Lead Ads pode ter configuração própria
3. Leads chegarão automaticamente no pipeline configurado
4. Dados de campanha serão salvos na tabela `lead_meta`
5. Notificações serão enviadas para admins e usuário atribuído

---

## Próximos Passos (em ordem)

1. Solicitar os 3 secrets do Facebook App
2. Executar as migrations SQL
3. O admin configura o webhook no Facebook Developers
4. Testar a conexão OAuth e recebimento de leads
