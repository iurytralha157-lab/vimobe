
# Adicionar Campos de Tracking: Meta Pixel, Google Tag Manager e Google Ads

## Resumo
Adicionar 3 novos campos de tracking na tabela `organization_sites` e na pagina de configuracoes do site, alem de injetar os scripts correspondentes no site publico.

## Alteracoes

### 1. Migration SQL - Novos campos na tabela `organization_sites`
Adicionar 3 colunas:
- `meta_pixel_id` (text, nullable) - ID do Meta Pixel (ex: 123456789)
- `google_tag_manager_id` (text, nullable) - ID do GTM (ex: GTM-XXXXXXX)
- `google_ads_id` (text, nullable) - ID do Google Ads (ex: AW-XXXXXXXXX)

### 2. `src/hooks/use-organization-site.ts`
Adicionar os 3 novos campos na interface `OrganizationSite`.

### 3. `src/hooks/use-public-site.ts`
Adicionar os 3 novos campos na interface `PublicSiteConfig`.

### 4. `src/pages/SiteSettings.tsx`
Na aba SEO, apos o campo "Google Analytics ID", adicionar 3 novos campos de input:
- **Meta Pixel ID** - placeholder: `123456789012345`
- **Google Tag Manager ID** - placeholder: `GTM-XXXXXXX`
- **Google Ads ID** - placeholder: `AW-XXXXXXXXX`

Incluir os campos no `formData` e no `useEffect` de carregamento.

### 5. `src/pages/public/PublicSiteLayout.tsx`
Adicionar um `useEffect` que injeta dinamicamente os scripts de tracking no `<head>` com base no `siteConfig`:

- **Google Analytics (ja existente no campo, mas sem injecao)**: Injetar `gtag.js` com o ID configurado
- **Meta Pixel**: Injetar o script `fbevents.js` com o pixel ID
- **Google Tag Manager**: Injetar o script do GTM + noscript iframe
- **Google Ads**: Funciona via gtag.js (mesmo script do GA4, basta adicionar `gtag('config', 'AW-XXX')`)

Cleanup: remover todos os scripts injetados quando o componente desmonta, garantindo que os codigos ficam apenas no site daquela organizacao.

### 6. Mapeadores de dados
Atualizar `mapSiteDataToConfig` em:
- `src/contexts/PublicSiteContext.tsx`
- `src/pages/public/PublishedSiteWrapper.tsx`
- `src/pages/public/PreviewSiteWrapper.tsx`

### 7. `resolve_site_domain` (funcao SQL)
Adicionar os 3 novos campos ao `jsonb_build_object` retornado pela funcao.

## Detalhes tecnicos

Cada script e injetado como elemento `<script>` no `document.head` e removido no cleanup do `useEffect`. Isso garante que:
- Cada site so carrega seus proprios codigos de tracking
- Nenhum tracking vaza entre organizacoes
- Ao sair do site publico, os scripts sao removidos
