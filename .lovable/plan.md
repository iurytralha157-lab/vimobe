

## Analytics Avançado do Site Público

### O que já existe
Vocês já têm um sistema básico de analytics (`site_analytics_events`) que rastreia pageviews, sessões, dispositivos, origens de tráfego e conversões. Porém faltam dados granulares como **imóveis mais vistos**, **leads gerados pelo site** e **ranking de páginas**.

### O que será adicionado

**1. Rastreamento de imóvel específico**
- Adicionar coluna `property_id` na tabela `site_analytics_events` para vincular pageviews a imóveis específicos
- No `PublicPropertyDetail.tsx`, registrar o `property_id` ao trackear a visualização da página do imóvel

**2. Novo evento: favorito**
- Registrar evento `favorite` quando visitante favorita um imóvel (já existe a lógica de favoritos no site público)

**3. Nova RPC: `get_site_analytics_detailed`**
- Retorna dados avançados:
  - **Top 10 imóveis mais vistos** (com título, código e contagem)
  - **Top páginas** (ranking por visualizações)
  - **Leads gerados pelo site** (cruzando conversões com leads que vieram do site)
  - **Evolução diária de visitas** (para gráfico de linha)
  - **Taxa de conversão** (conversões / sessões únicas)

**4. Dashboard expandido no `SiteAnalyticsTab`**
Novas seções no painel existente:
- **Imóveis Mais Vistos** — tabela com ranking dos 10 imóveis mais acessados (código, título, views, favoritos)
- **Páginas Mais Acessadas** — ranking das URLs mais visitadas
- **Gráfico de Evolução** — gráfico de linha mostrando visitas por dia no período
- **Taxa de Conversão** — percentual de sessões que converteram
- **Leads do Site** — contagem de leads gerados via formulário de contato do site

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Adicionar `property_id` à tabela + criar RPC `get_site_analytics_detailed` |
| `src/hooks/use-site-analytics.ts` | Adicionar `property_id` ao `trackPageView`, nova função `trackFavorite`, novo hook `useSiteAnalyticsDetailed` |
| `src/pages/public/PublicPropertyDetail.tsx` | Passar `property_id` no tracking |
| `src/hooks/use-public-favorites.ts` | Chamar `trackFavorite` ao favoritar |
| `src/components/site/SiteAnalyticsTab.tsx` | Novas seções: top imóveis, top páginas, gráfico evolução, taxa conversão |

### Detalhes técnicos

**Migration SQL:**
```sql
ALTER TABLE site_analytics_events ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX idx_site_analytics_property ON site_analytics_events(property_id) WHERE property_id IS NOT NULL;
```

**Nova RPC** retornará JSON com:
- `topProperties`: array com `{property_id, title, code, views, favorites}`
- `topPages`: array com `{page_path, views}`
- `dailyViews`: array com `{date, views}` para o gráfico
- `conversionRate`: número percentual

**Gráfico** usará Recharts (já disponível no projeto via shadcn charts).

