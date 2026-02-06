
# Plano: Sistema de Rastreamento de Leads + Melhorias no Webhook

## O que você pediu

1. **Aba de Contato** - Exibir dados de rastreamento (campanha, ad, UTMs, etc)
2. **Webhook melhorado** - Aceitar e salvar campos de rastreamento (UTMs, campanha, etc)
3. **Interface unificada** - Mostrar dados tanto do Meta quanto do Webhook

---

## Estrutura de Dados

### Tabela `lead_meta` - Expandir para suportar dados de webhook também

Campos atuais (Meta):
- `campaign_id`, `adset_id`, `ad_id`
- `campaign_name`, `adset_name`, `ad_name`
- `form_id`, `page_id`, `platform`
- `raw_payload`

**Novos campos** a adicionar:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `utm_source` | text | UTM de origem (google, facebook, etc) |
| `utm_medium` | text | UTM de mídia (cpc, email, social) |
| `utm_campaign` | text | UTM de campanha |
| `utm_content` | text | UTM de conteúdo |
| `utm_term` | text | UTM de termo de busca |
| `form_name` | text | Nome do formulário |
| `source_type` | text | 'meta' ou 'webhook' |
| `contact_notes` | text | Notas/observações do contato |

---

## Parte 1: Nova Seção de Rastreamento no Card do Lead

Dentro da aba "Contato", após os dados de origem, mostrar um card com todos os dados de rastreamento:

```text
┌────────────────────────────────────────────────────────────────┐
│  📊 Rastreamento                                               │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 📈 Campanha                                              │  │
│  │                                                         │  │
│  │  Campanha:   Black Friday 2026                         │  │
│  │  Conjunto:   Leads Quentes - SP                        │  │
│  │  Anúncio:    Carrousel - Apartamentos                  │  │
│  │  Formulário: Formulário Principal                      │  │
│  │  Criado:     05/02/2026 às 14:32                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 🏷️ UTM Parameters                                       │  │
│  │                                                         │  │
│  │  utm_source:   facebook                                │  │
│  │  utm_medium:   cpc                                     │  │
│  │  utm_campaign: black_friday_2026                       │  │
│  │  utm_content:  carrousel_v2                            │  │
│  │  utm_term:     apartamento zona sul                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 📝 Observações do Contato                               │  │
│  │                                                         │  │
│  │  "Viu o anúncio no Instagram, perguntou sobre          │  │
│  │   financiamento e condições de pagamento"               │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Parte 2: Webhook Aceita Novos Campos

O webhook vai aceitar esses campos extras no payload:

```json
{
  "name": "João Silva",
  "phone": "11999999999",
  "email": "joao@email.com",
  "message": "Interesse no imóvel",
  
  "campaign_id": "123456",
  "campaign_name": "Black Friday 2026",
  "adset_id": "789",
  "adset_name": "Leads Quentes - SP",
  "ad_id": "101112",
  "ad_name": "Carrousel - Apartamentos",
  "form_name": "Formulário Principal",
  
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "black_friday_2026",
  "utm_content": "carrousel_v2",
  "utm_term": "apartamento zona sul",
  
  "contact_notes": "Lead interessado em financiamento"
}
```

Após criar o lead, o webhook vai inserir esses dados na tabela `lead_meta`.

---

## Parte 3: Interface de Webhooks Melhorada

Adicionar seção de documentação mostrando os novos campos de rastreamento:

```text
┌────────────────────────────────────────────────────────────────┐
│  📋 Campos de Rastreamento (opcionais)                         │
│                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ utm_source  │ │ utm_medium  │ │ utm_campaign│              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│  ┌─────────────┐ ┌─────────────┐                              │
│  │ utm_content │ │ utm_term    │                              │
│  └─────────────┘ └─────────────┘                              │
│                                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │ campaign_id     │ │ campaign_name   │ │ form_name       │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐                      │
│  │ ad_id           │ │ ad_name         │                      │
│  └─────────────────┘ └─────────────────┘                      │
│  ┌─────────────────┐ ┌─────────────────┐                      │
│  │ adset_id        │ │ adset_name      │                      │
│  └─────────────────┘ └─────────────────┘                      │
│  ┌─────────────────┐                                          │
│  │ contact_notes   │                                          │
│  └─────────────────┘                                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | Adicionar novos campos à tabela `lead_meta` |
| `supabase/functions/generic-webhook/index.ts` | Extrair e salvar campos de rastreamento |
| `src/hooks/use-lead-meta.ts` | Atualizar interface para novos campos |
| `src/components/leads/LeadDetailDialog.tsx` | Adicionar seção de rastreamento na aba Contato |
| `src/components/settings/WebhooksTab.tsx` | Atualizar documentação com novos campos |

### Migration SQL

```sql
ALTER TABLE lead_meta 
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS form_name text,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS contact_notes text;
```

### Lógica do Webhook

O webhook vai:
1. Extrair campos de rastreamento do payload
2. Criar o lead normalmente
3. Inserir registro em `lead_meta` com todos os dados de tracking
4. Marcar `source_type: 'webhook'` para diferenciar do Meta

### Interface do LeadDetailDialog

A seção de rastreamento só aparece se houver dados em `lead_meta`:
- Se `leadMeta` não for null, renderiza os cards
- Agrupa informações por categoria (Campanha, UTMs, Notas)
- Mostra apenas campos que têm valor (sem linhas vazias)

---

## Benefícios

1. **Visibilidade total** - Veja de onde cada lead veio com detalhes
2. **Integração unificada** - Funciona tanto com Meta quanto com webhooks externos
3. **Flexibilidade** - Aceita qualquer combinação de campos UTM
4. **Histórico completo** - Dados ficam salvos para análise futura
5. **Documentação clara** - Exemplo de requisição atualizado com todos os campos
