

# Dashboard de Campanhas Meta Ads

## Situação atual

A tabela `lead_meta` já armazena `campaign_id`, `campaign_name`, `adset_id/name`, `ad_id/name`, `creative_url`, `creative_video_url` para cada lead recebido via Meta. Existem ~636 leads com dados de campanha. Porém, dados de **investimento/gasto** (spend, CPL, impressões) vêm da **Meta Marketing API** (endpoint de Insights), que é diferente do webhook de Leadgen.

## O que será construído

### 1. Nova Edge Function: `meta-campaign-insights`
Busca dados de investimento na Meta Marketing API usando o `access_token` já salvo em `meta_integrations`:
- Endpoint: `GET /v19.0/{campaign_id}/insights?fields=spend,impressions,reach,cpc,actions`
- Também busca por adset e ad individualmente
- Precisa do Ad Account ID — será obtido via `GET /v19.0/me/adaccounts` e salvo na tabela `meta_integrations` (nova coluna `ad_account_id`)

### 2. Nova tabela: `meta_campaign_insights` (cache)
Armazena os dados de insights para evitar chamadas repetidas à API do Meta:

```text
meta_campaign_insights
├── id (uuid)
├── organization_id (uuid, FK)
├── campaign_id (text)
├── campaign_name (text)
├── adset_id (text)
├── adset_name (text)  
├── ad_id (text)
├── ad_name (text)
├── creative_url (text)
├── creative_video_url (text)
├── spend (numeric)           ← gasto total
├── impressions (integer)     ← impressões
├── reach (integer)           ← alcance
├── leads_count (integer)     ← leads (da API)
├── cpl (numeric)             ← custo por lead
├── date_start (date)
├── date_stop (date)
├── fetched_at (timestamptz)
├── created_at (timestamptz)
```

RLS: visível apenas para membros da organização.

### 3. Nova coluna em `meta_integrations`
- `ad_account_id text` — preenchido automaticamente na primeira sync

### 4. Novo componente: `CampaignPerformanceWidget`
Card no Dashboard com:
- **KPIs no topo**: Investimento Total, CPL Médio, Total de Leads Meta, Impressões
- **Tabela/lista de campanhas** ordenada por leads ou spend:
  - Nome da campanha
  - Leads gerados (contagem do `lead_meta`)
  - Gasto (R$)
  - CPL (R$)
  - Preview do criativo (thumbnail clicável)
- **Drill-down**: clicar numa campanha expande para ver conjuntos e anúncios individuais
- Botão "Sincronizar dados" para atualizar os insights

### 5. Novo hook: `use-campaign-insights`
- Agrega dados do `lead_meta` (contagem de leads por campanha/adset/ad)
- Busca dados de spend do `meta_campaign_insights` (cache)
- Dispara sync via edge function quando necessário
- Respeita os filtros de data do dashboard

### 6. Integração no Dashboard
No `Dashboard.tsx`, adicionar o widget abaixo dos gráficos existentes (para segmento imobiliário):

```text
┌─────────────────────────────────────────────────┐
│  KPIs  │  Funil + Evolução  │  Brokers + Fontes │
├─────────────────────────────────────────────────┤
│          📊 Performance de Campanhas Meta        │
│  ┌──────┬──────┬──────┬──────┐                  │
│  │Invest│ CPL  │Leads │Impr. │  ← KPI cards     │
│  └──────┴──────┴──────┴──────┘                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Campanha MCMV  │ 444 leads │ R$2.100 │ ...│  │
│  │ Campanha FORM  │  85 leads │ R$  890 │ ...│  │
│  │ ...expandir p/ ver conjuntos e anúncios  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Etapas de execução

1. **Migration**: criar tabela `meta_campaign_insights` + adicionar `ad_account_id` em `meta_integrations`
2. **Edge Function** `meta-campaign-insights`: buscar Ad Account ID, buscar insights por campanha/adset/ad, salvar no cache
3. **Hook** `use-campaign-insights.ts`: agregar lead_meta + cache de insights, respeitar filtros
4. **Componente** `CampaignPerformanceWidget.tsx`: KPIs + tabela com drill-down + preview do criativo
5. **Dashboard.tsx**: integrar o novo widget

## Observação importante

A Meta Marketing API requer a permissão `ads_read` no token de acesso. Se o token atual (gerado no OAuth para Leadgen) não tiver essa permissão, será necessário reconectar a integração Meta com o escopo adicional. Vou verificar isso na implementação e avisar se for o caso.

