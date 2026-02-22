

# Correcao Completa: Dominio Customizado com Tela Branca

## Diagnostico

Analisei todo o fluxo e encontrei **3 problemas**:

### Problema 1: Codigo nao publicado
As alteracoes feitas no `App.tsx` (deteccao de dominio customizado via `isCustomDomain()`) existem apenas no ambiente de teste. O site publicado em `vimobe.lovable.app` ainda roda o codigo antigo, que redireciona para login/CRM. **E preciso publicar o projeto.**

### Problema 2: Edge Function `resolve-site-domain` retorna campos incompletos
A funcao que resolve o dominio customizado faz um SELECT que **nao inclui** campos obrigatorios:
- `logo_width`, `logo_height` -- tamanho do logo
- `watermark_enabled`, `watermark_size` -- configuracao de marca d'agua  
- `organization_name` -- nome da organizacao (usado no rodape e textos)

Sem esses campos, o site pode carregar com dados incompletos ou erros.

### Problema 3: Worker do Cloudflare ainda tem logica antiga
O Worker atual faz reescrita de path (`/sites/vimob/...`), mas como o frontend agora detecta o dominio customizado e renderiza as rotas publicas diretamente, o Worker deve ser simplificado para apenas fazer proxy.

## Solucao

### 1. Atualizar `resolve-site-domain` Edge Function
Adicionar os campos faltantes no SELECT e incluir o `organization_name` via join com a tabela `organizations`.

**Arquivo**: `supabase/functions/resolve-site-domain/index.ts`
- Adicionar ao SELECT: `logo_width, logo_height, watermark_enabled, watermark_size`
- Adicionar join: `organizations(name)` para obter o `organization_name`
- Mapear `organization_name` no `site_config` retornado

### 2. Publicar o projeto
As alteracoes no `App.tsx` (funcao `isCustomDomain()` e componente `CustomDomainRoutes`) ja estao no codigo. Basta publicar para que o dominio publicado (`vimobe.lovable.app`) passe a usar essa logica.

### 3. Atualizar o Worker do Cloudflare
Apos publicar, substituir o Worker por:

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

## Fluxo esperado apos as correcoes

1. Usuario acessa `virandoachaveometodo.com.br`
2. Worker faz proxy para `vimobe.lovable.app/` (sem reescrita)
3. App carrega, `isCustomDomain()` detecta dominio customizado
4. `CustomDomainRoutes` renderiza com `PublicSiteProvider`
5. `PublicSiteContext` chama `resolve-site-domain` com `virandoachaveometodo.com.br`
6. Edge Function encontra no banco (`custom_domain = virandoachaveometodo.com.br`, `subdomain = vimob`)
7. Retorna configuracao completa do site
8. Site publico aparece -- identico ao link temporario `vimob.vettercompany.com.br/sites/vimob`

## Arquivos a modificar

1. **`supabase/functions/resolve-site-domain/index.ts`** -- Adicionar campos faltantes e join com organizations
2. **Publicar o projeto** -- Para que as alteracoes do App.tsx entrem em producao
3. **Worker do Cloudflare** -- Simplificar (acao manual do usuario)

## Ordem de execucao

1. Corrigir a Edge Function (campos faltantes)
2. Deploy da Edge Function
3. Publicar o projeto
4. Atualizar o Worker no Cloudflare (manual)
5. Testar acessando `virandoachaveometodo.com.br`

