
# Corrigir cores no site publicado com dominio customizado

## Problema Raiz
A edge function `resolve-site-domain` nao inclui os campos `site_theme`, `background_color`, `text_color` e `card_color` na query SELECT (linha 34). Quando o site carrega via dominio customizado (ex: virandoachaveometodo.br), esses campos ficam ausentes no `site_config`, e os componentes recebem `undefined` ao inves das cores configuradas.

Alem disso, no `PublicSiteContext.tsx`, quando o site e carregado via `resolve-site-domain`, o `site_config` e aplicado diretamente sem passar pela funcao `mapSiteDataToConfig` que adicionaria os valores padrao.

## Correcoes

### 1. `supabase/functions/resolve-site-domain/index.ts`
- Adicionar `site_theme`, `background_color`, `text_color`, `card_color`, `watermark_size`, `watermark_position` na query SELECT (linha 34)

### 2. `src/contexts/PublicSiteContext.tsx`
- Na linha 92, ao receber `data.site_config` do edge function, garantir que os campos de tema tenham valores padrao antes de setar no state. Aplicar defaults para `site_theme`, `background_color`, `text_color` e `card_color`.

## Detalhes Tecnicos

A query atual na edge function:
```
.select('organization_id, subdomain, custom_domain, site_title, ..., watermark_enabled, organizations(name)')
```

Precisa incluir:
```
site_theme, background_color, text_color, card_color, watermark_size, watermark_position
```

No contexto, trocar:
```typescript
setSiteConfig(data.site_config);
```
Por algo que aplique defaults:
```typescript
setSiteConfig({
  ...data.site_config,
  site_theme: data.site_config.site_theme || 'dark',
  background_color: data.site_config.background_color || '#0D0D0D',
  text_color: data.site_config.text_color || '#FFFFFF',
  card_color: data.site_config.card_color || '#FFFFFF',
});
```

Total: 2 arquivos modificados + deploy da edge function.
