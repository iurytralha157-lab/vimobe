
# Pixels de Rastreamento + Campos Ocultos UTM no Formulario

## Resumo
Adicionar campos de configuracao para codigos de rastreamento (Meta Pixel, Google Tag Manager, Google Ads) na aba SEO do site, injetar esses scripts automaticamente no site publico, e capturar parametros UTM da URL como campos ocultos no formulario de contato -- salvando tudo na tabela `lead_meta` que ja existe.

## O que sera feito

### 1. Novos campos no banco de dados
Adicionar 3 colunas na tabela `organization_sites`:
- `meta_pixel_id` (text) -- ID do Pixel do Meta/Facebook (ex: "123456789")
- `gtm_id` (text) -- ID do Google Tag Manager (ex: "GTM-XXXXXXX")
- `google_ads_id` (text) -- ID do Google Ads (ex: "AW-123456789")

O campo `google_analytics_id` ja existe.

### 2. Aba SEO -- Novos campos de configuracao
Na aba SEO do painel de configuracoes do site (`SiteSettings.tsx`), adicionar um novo card "Codigos de Rastreamento" com campos para:

| Campo | Placeholder | Descricao |
|-------|-------------|-----------|
| Meta Pixel ID | 123456789012345 | Pixel do Facebook/Instagram Ads |
| Google Tag Manager ID | GTM-XXXXXXX | Container do GTM |
| Google Ads ID | AW-123456789 | Conversoes do Google Ads |
| Google Analytics ID | G-XXXXXXXXXX | Ja existe, sera movido para este card |

### 3. Injecao automatica de scripts no site publico
No `PublicSiteLayout.tsx`, adicionar um `useEffect` que injeta dinamicamente no `<head>` do documento:

- **Meta Pixel**: Script padrao do `fbq('init', 'ID')` + noscript img
- **Google Tag Manager**: Script padrao do GTM + dataLayer
- **Google Analytics (GA4)**: Script do `gtag.js` (ja tem o campo, so falta a injecao)
- **Google Ads**: Tag de remarketing via gtag

Os scripts serao injetados apenas quando o ID estiver configurado e removidos ao desmontar o componente (evitar vazamento entre organizacoes).

### 4. Campos ocultos UTM no formulario de contato
No `ContactFormDialog.tsx`:
- Ao abrir o formulario, capturar automaticamente da URL: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Tambem capturar `gclid` (Google Click ID) e `fbclid` (Facebook Click ID)
- Enviar esses dados como campos extras no body do POST para `public-site-contact`
- Os campos sao invisíveis para o usuario

### 5. Edge Function `public-site-contact` -- Salvar UTM
Atualizar a edge function para:
- Receber os novos campos UTM do formulario
- Apos criar/atualizar o lead, inserir/atualizar um registro em `lead_meta` com:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
  - `source_type: 'website'`
  - `contact_notes`: mensagem do formulario
- Isso faz com que os dados UTM aparecam automaticamente na aba "Rastreamento" do lead (componente `LeadTrackingSection` que ja existe)

### 6. Propagar configs para o site publico
Atualizar as interfaces `PublicSiteConfig`, `OrganizationSite` e os mapeamentos em:
- `use-public-site.ts`
- `PublicSiteContext.tsx`
- `PreviewSiteWrapper.tsx`
- `PublishedSiteWrapper.tsx`
- `resolve-site-domain` (edge function)

## Detalhes Tecnicos

### Migration SQL
```sql
ALTER TABLE organization_sites
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS gtm_id text,
  ADD COLUMN IF NOT EXISTS google_ads_id text;
```

### Injecao de scripts (PublicSiteLayout.tsx)
Novo useEffect que cria elementos `<script>` e insere no `document.head`. Cada script tem um `data-tracking` attribute para facilitar a remocao no cleanup. Exemplo para Meta Pixel:

```typescript
if (siteConfig.meta_pixel_id) {
  const script = document.createElement('script');
  script.setAttribute('data-tracking', 'meta-pixel');
  script.textContent = `!function(f,b,e,v,n,t,s){...}('${siteConfig.meta_pixel_id}');`;
  document.head.appendChild(script);
}
```

### Captura UTM no formulario
```typescript
const urlParams = new URLSearchParams(window.location.search);
const utmData = {
  utm_source: urlParams.get('utm_source'),
  utm_medium: urlParams.get('utm_medium'),
  utm_campaign: urlParams.get('utm_campaign'),
  utm_content: urlParams.get('utm_content'),
  utm_term: urlParams.get('utm_term'),
  gclid: urlParams.get('gclid'),
  fbclid: urlParams.get('fbclid'),
};
```

### Arquivos criados/modificados
1. **Migration SQL** -- adicionar 3 colunas
2. `src/pages/SiteSettings.tsx` -- card "Codigos de Rastreamento" na aba SEO
3. `src/hooks/use-organization-site.ts` -- novos campos na interface
4. `src/hooks/use-public-site.ts` -- novos campos no PublicSiteConfig
5. `src/contexts/PublicSiteContext.tsx` -- mapear novos campos
6. `src/pages/public/PublicSiteLayout.tsx` -- injetar scripts de tracking
7. `src/pages/public/PreviewSiteWrapper.tsx` -- propagar novos campos
8. `src/pages/public/PublishedSiteWrapper.tsx` -- propagar novos campos
9. `src/components/public/ContactFormDialog.tsx` -- capturar UTMs ocultos
10. `supabase/functions/public-site-contact/index.ts` -- salvar UTM em lead_meta
11. `supabase/functions/resolve-site-domain/index.ts` -- incluir novos campos na resposta
