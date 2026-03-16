

# Refatorar widget de campanhas para usar dados do `lead_meta` como fonte primária

## Problema atual

O hook `useCampaignInsights` depende da tabela `meta_campaign_insights` para montar a hierarquia de campanhas. Se a sincronização com a API do Meta nunca foi feita, o widget fica vazio -- mesmo tendo centenas de leads com dados de campanha já salvos em `lead_meta`.

## Solução

Inverter a lógica: construir a hierarquia (campanha > conjunto > anuncio) a partir do `lead_meta`, que ja tem `campaign_id/name`, `adset_id/name`, `ad_id/name`, `creative_url`, `creative_video_url`. Depois, enriquecer com dados de spend/impressoes do `meta_campaign_insights` quando disponíveis.

## Alterações

### 1. Hook `use-campaign-insights.ts` -- refatorar queryFn

**Antes:** Busca `meta_campaign_insights` primeiro, depois faz overlay de lead counts.
**Depois:**
1. Buscar todos os `lead_meta` com `campaign_id` nao nulo, fazer join com `leads` para filtrar por data
2. Agrupar por campanha > conjunto > anuncio, contando leads
3. Buscar `meta_campaign_insights` opcionalmente para enriquecer com spend/impressoes/CPL
4. Merge: se tem dados do Meta, mostra; se nao, mostra so lead counts com spend/CPL como "—"

Fluxo simplificado:
```text
lead_meta + leads (filtro data) → agrupar por campaign/adset/ad → hierarquia base
meta_campaign_insights (opcional) → enriquecer com spend/impressions
```

### 2. Widget `CampaignPerformanceWidget.tsx` -- ajustar UI

- KPIs: mostrar "Total Leads Meta", "Campanhas ativas", "Conjuntos", "Anuncios" quando nao tem dados de spend
- Quando tem dados de spend (apos sync), mostrar Investimento + CPL tambem
- Colunas da tabela: se nao tem spend, esconder colunas Gasto/CPL e mostrar so Leads
- Botao "Sincronizar Meta Ads" continua disponível para enriquecer com dados financeiros
- Mostrar preview de criativo nos anuncios (ja funciona)
- Remover a condicao que esconde o widget quando nao tem dados de `meta_campaign_insights`

### 3. Sem alteracoes no banco

Tudo ja existe. Apenas muda a logica de consulta no frontend.

## Resultado esperado

O widget mostra imediatamente todas as campanhas que geraram leads no CRM, com contagem de leads por campanha/conjunto/anuncio. O botao de sincronizar adiciona dados financeiros (gasto, CPL, impressoes) por cima.

