

# Atualizar Titulo e Favicon da Aba do Navegador Dinamicamente

## Problema
Quando o site publico e acessado pelo dominio customizado, o titulo da aba do navegador mostra "Vimob - CRM Imobiliario Inteligente" (valor fixo do `index.html`) e o favicon tambem e o da Vimob. O correto e mostrar o titulo e favicon configurados pela organizacao.

## Solucao
Adicionar um `useEffect` no componente `PublicSiteLayout.tsx` que atualiza dinamicamente o `document.title` e o favicon do navegador com base no `siteConfig` da organizacao.

## Alteracoes

### `src/pages/public/PublicSiteLayout.tsx`
Adicionar um `useEffect` apos os hooks existentes (por volta da linha 26) que:

1. Define `document.title` usando `siteConfig.seo_title` (prioridade) ou `siteConfig.site_title` como fallback
2. Atualiza o `<link rel="icon">` no `<head>` com o `siteConfig.favicon_url` (se configurado)
3. Restaura os valores originais quando o componente desmonta (cleanup)

```typescript
useEffect(() => {
  if (!siteConfig) return;

  const originalTitle = document.title;
  const originalFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href;

  // Atualizar titulo
  document.title = siteConfig.seo_title || siteConfig.site_title || 'Site Imobiliario';

  // Atualizar favicon
  if (siteConfig.favicon_url) {
    let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = siteConfig.favicon_url;
  }

  return () => {
    document.title = originalTitle;
    if (originalFavicon) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = originalFavicon;
    }
  };
}, [siteConfig]);
```

Nenhuma outra alteracao necessaria -- os campos `seo_title`, `site_title` e `favicon_url` ja existem no `siteConfig` e ja podem ser configurados na pagina de configuracoes do site no CRM.

