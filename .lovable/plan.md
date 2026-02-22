

# Correcao: Site Publico em Dominio Customizado

## Problema raiz

O Worker do Cloudflare faz proxy corretamente no servidor -- ele busca `vimobe.lovable.app/sites/vimob` e retorna o HTML. Porem, como o Vimobe e uma SPA (Single Page Application), o HTML retornado e sempre o mesmo `index.html`. Quando o navegador do usuario carrega esse HTML, o React Router olha a URL **do navegador** (que e `royal-river-fa01.companyvetter.workers.dev/`) e ve a rota `/` -- que no App.tsx redireciona para `/dashboard` ou `/auth`. Por isso aparece a tela de login.

O problema NAO esta no Worker. O Worker esta correto. O problema esta no App.tsx que nao sabe que o dominio customizado deve mostrar o site publico.

## Solucao

### 1. Detectar dominio customizado no App.tsx

Adicionar uma funcao `isCustomDomain()` que verifica se o hostname atual e um dominio customizado (nao e localhost, nem lovable.app, nem lovable.dev, nem lovableproject.com).

Quando for dominio customizado, renderizar APENAS as rotas do site publico usando o `PublicSiteContext` para resolver qual organizacao pertence ao dominio.

**Arquivo**: `src/App.tsx`

```text
function isCustomDomain(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname !== 'localhost' &&
    !hostname.includes('lovable.app') &&
    !hostname.includes('lovable.dev') &&
    !hostname.includes('lovableproject.com')
  );
}
```

No componente `App`, antes de renderizar as rotas do CRM, verificar:
- Se `isCustomDomain()` retorna true, renderizar o `PublicSiteProvider` + rotas publicas (Home, Imoveis, Sobre, Contato, Favoritos)
- Se nao, renderizar as rotas normais do CRM (comportamento atual)

### 2. Criar componente de rotas para dominio customizado

Dentro do `App.tsx`, adicionar um componente `CustomDomainRoutes` que:
- Usa o `PublicSiteProvider` (de `src/contexts/PublicSiteContext.tsx`) para resolver o dominio e carregar a configuracao do site
- Renderiza o `PublicSiteLayout` com as sub-rotas: Home, Imoveis, Sobre, Contato, Favoritos
- Reutiliza os mesmos componentes que ja existem em `PublishedSiteWrapper`

### 3. Simplificar o codigo do Worker no SiteSettings

**Arquivo**: `src/pages/SiteSettings.tsx`

O Worker nao precisa mais de logica de slug nem de assets. Ele vira um proxy simples:

```text
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = 'vimobe.lovable.app';
    const targetUrl = 'https://' + target + url.pathname + url.search;
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': target,
        'X-Forwarded-Host': url.hostname,
      },
      body: ['GET','HEAD'].includes(request.method) ? undefined : request.body,
    });
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
};
```

Sem slug, sem isAsset, sem logica complexa. O Worker so repassa a requisicao e o App detecta o dominio.

### 4. Ajustar PublicSiteContext

**Arquivo**: `src/contexts/PublicSiteContext.tsx`

O contexto ja resolve dominios customizados chamando `resolve-site-domain`. Apenas garantir que o hostname do Worker (via `X-Forwarded-Host` ou direto) e corretamente usado na resolucao.

## Arquivos modificados

1. **`src/App.tsx`** -- Adicionar deteccao de dominio customizado e renderizacao condicional das rotas publicas
2. **`src/pages/SiteSettings.tsx`** -- Simplificar o template do Worker (remover logica de slug e assets)
3. **`src/contexts/PublicSiteContext.tsx`** -- Pequeno ajuste para garantir compatibilidade

## Resultado esperado

- Usuario acessa `virandoachaveometodo.com.br` --> Worker faz proxy para `vimobe.lovable.app`
- App detecta que o hostname nao e lovable --> renderiza site publico
- `PublicSiteContext` resolve o dominio e carrega a configuracao da organizacao correta
- Navegacao interna (imoveis, sobre, contato) funciona normalmente
- Sem redirecionamento para login/CRM

