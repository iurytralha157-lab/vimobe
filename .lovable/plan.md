
# Correcao: Navegacao do Site Publicado via Link Temporario

## Problema

Quando o site e acessado pelo link temporario (`/sites/vimob`), os links internos de navegacao (Sobre, Imoveis, Contato, etc.) apontam para `/sobre`, `/imoveis`, etc. -- perdendo o prefixo `/sites/vimob`. Isso faz com que a navegacao quebre.

O problema esta na funcao `getHref` que existe em 6 arquivos. Ela so trata dois casos:
- Modo preview: `/site/preview/...`
- Outros: `/{path}`

Falta o caso `/sites/:slug/...`.

## Solucao

Atualizar a funcao `getHref` em todos os 6 arquivos para detectar quando a URL contem `/sites/:slug` e adicionar o prefixo correto.

A logica sera:
1. Se esta em modo preview --> `/site/preview/{path}?org=...`
2. Se a URL contem `/sites/{slug}` --> `/sites/{slug}/{path}`
3. Senao (dominio customizado ou outro) --> `/{path}`

## Arquivos a modificar

1. **`src/pages/public/PublicSiteLayout.tsx`** (linhas 75-83)
2. **`src/pages/public/PublicProperties.tsx`** (funcao getHref)
3. **`src/pages/public/PublicFavorites.tsx`** (funcao getHref)
4. **`src/pages/public/PublicAbout.tsx`** (funcao getHref)
5. **`src/pages/public/PublicHome.tsx`** (funcao getHref)
6. **`src/pages/public/PublicPropertyDetail.tsx`** (funcao getHref)

## Detalhe tecnico

Em cada arquivo, a funcao `getHref` sera atualizada para:

```text
const getHref = (path: string) => {
  if (isPreviewMode && orgParam) {
    if (path.includes('?')) {
      return `/site/preview/${path}&org=${orgParam}`;
    }
    return `/site/preview/${path}?org=${orgParam}`;
  }
  // Detectar /sites/:slug na URL atual
  const siteMatch = location.pathname.match(/^\/sites\/([^/]+)/);
  if (siteMatch) {
    const slug = siteMatch[1];
    return `/sites/${slug}/${path}`;
  }
  return `/${path}`;
};
```

Isso garante que todos os links internos mantenham o prefixo `/sites/vimob/` quando o site e acessado pelo link temporario.
