
# Plano: Sistema Avançado de Regras de Distribuição

## Resumo
Vou aprimorar o sistema de regras de distribuição para permitir controle granular por:
- **Webhook específico** - quando fonte = webhook, mostrar lista de webhooks configurados
- **Conexão WhatsApp específica** - quando fonte = WhatsApp, mostrar lista de conexões
- **Formulário Meta específico** - quando fonte = Meta Ads, mostrar lista de formulários
- **Website** com filtros por imóvel ou categoria (locação/venda)

Também removerei WordPress e Manual das opções de fonte (não fazem sentido para distribuição).

---

## Mudanças Necessárias

### 1. Banco de Dados
Adicionar colunas na tabela `leads` para rastrear a origem específica:

```text
+------------------+------+----------------------------------+
| Coluna           | Tipo | Descrição                        |
+------------------+------+----------------------------------+
| source_webhook_id| UUID | ID do webhook que criou o lead   |
| source_session_id| UUID | ID da sessão WhatsApp de origem  |
+------------------+------+----------------------------------+
```

Atualizar a função `pick_round_robin_for_lead` para suportar os novos filtros.

### 2. Edge Functions
Atualizar os webhooks para salvar o ID da origem:
- `generic-webhook` - salvar `source_webhook_id`
- `evolution-webhook` - salvar `source_session_id`

### 3. Interface do Editor de Distribuição

**Fontes disponíveis (atualizado):**
- Meta Ads → mostra lista de formulários configurados
- Facebook
- Instagram  
- WhatsApp → mostra lista de conexões
- Webhook → mostra lista de webhooks
- Website → mostra filtros por imóvel ou categoria

**Removidos:** WordPress, Manual

**Nova lógica de seleção:**

```text
┌─────────────────────────────────────────────────────────┐
│ Tipo de Condição: [Fonte ▼]                             │
├─────────────────────────────────────────────────────────┤
│ Fonte: [Webhook ▼]                                      │
│                                                         │
│ ┌─ Webhook específico ─────────────────────────────┐   │
│ │ ☑ Make                                           │   │
│ │ ☐ RD Station                                     │   │
│ │ ☐ Landing Page X                                 │   │
│ └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4. Novos Tipos de Condição

```text
+---------------------+------------------------------------------+
| Tipo                | Descrição                                |
+---------------------+------------------------------------------+
| source              | Fonte genérica (facebook, instagram...)  |
| webhook             | Webhook específico (por ID)              |
| whatsapp_session    | Conexão WhatsApp específica (por ID)     |
| meta_form           | Formulário Meta específico (já existe)   |
| website_property    | Lead do site com imóvel específico       |
| website_category    | Lead do site por categoria (venda/locação)|
+---------------------+------------------------------------------+
```

---

## Seção Técnica

### Migração SQL

```sql
-- Adicionar colunas de rastreamento de origem
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_webhook_id UUID REFERENCES webhooks_integrations(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_session_id UUID REFERENCES whatsapp_sessions(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_source_webhook ON leads(source_webhook_id) WHERE source_webhook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_session ON leads(source_session_id) WHERE source_session_id IS NOT NULL;
```

### Atualização da função `pick_round_robin_for_lead`

Adicionar suporte para:
- `webhook` - match por `source_webhook_id`
- `whatsapp_session` - match por `source_session_id`
- `website_category` - match por categoria do imóvel de interesse

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `DistributionQueueEditor.tsx` | Atualizar UI com novos seletores |
| `use-create-queue-advanced.ts` | Adicionar novos tipos de condição |
| `generic-webhook/index.ts` | Salvar `source_webhook_id` |
| `evolution-webhook/index.ts` | Salvar `source_session_id` |
| Função SQL `pick_round_robin_for_lead` | Adicionar matching para novos tipos |

### Hooks Necessários

O editor já importa:
- `useWebhooks()` - lista de webhooks
- `useWhatsAppSessions()` - lista de conexões WhatsApp

Será necessário buscar `meta_form_configs` para listar formulários Meta.

---

## Fluxo do Usuário

1. Usuário abre o editor de fila de distribuição
2. Clica em "+ Adicionar Condição"
3. Seleciona "Fonte" como tipo de condição
4. Seleciona "Webhook" como fonte
5. Aparece lista com todos os webhooks configurados
6. Usuário seleciona os webhooks desejados
7. Salva a fila

Agora, leads vindos desses webhooks específicos serão distribuídos para essa fila.
