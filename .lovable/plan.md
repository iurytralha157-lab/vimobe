

# Corrigir Resolucao de Dominio via Cloudflare Workers

## Problema
O site esta acessivel pelo Workers.dev (`royal-river-fa01.companyvetter.workers.dev`), mas o `PublicSiteContext` envia esse hostname para a edge function `resolve-site-domain`, que procura na coluna `custom_domain` da tabela `organization_sites`. O dominio armazenado la e `virandoachaveometodo.com.br`, nao o dominio do Workers.dev -- por isso retorna "Site nao encontrado".

## Solucao
Modificar o `PublicSiteContext.tsx` para adicionar um fallback: se a resolucao por dominio falhar (404), tentar a edge function `get-worker-config` que mapeia o Workers.dev domain para o slug (subdomain), e entao carregar o site pelo subdomain.

## Alteracoes

### `src/contexts/PublicSiteContext.tsx`
Na funcao `resolveSite`, apos o bloco que chama `resolve-site-domain`, adicionar um fallback:

1. Se `resolve-site-domain` retornar 404 ou `found: false`, chamar `get-worker-config` com o mesmo hostname
2. Se `get-worker-config` retornar um `slug`, buscar o site config diretamente do Supabase usando `organization_sites.subdomain = slug`
3. Montar o `siteConfig` com os dados retornados (mesmo mapeamento usado em `PublishedSiteWrapper`)

### Logica resumida

```text
1. Chamar resolve-site-domain(hostname)
2. Se encontrou -> usar dados (fluxo atual)
3. Se NAO encontrou:
   a. Chamar get-worker-config(hostname)
   b. Se retornou slug:
      - Buscar organization_sites WHERE subdomain = slug
      - Montar siteConfig
   c. Se nao -> mostrar erro "Site nao encontrado"
```

### Detalhes tecnicos
- A edge function `get-worker-config` ja existe e retorna `{ slug, target }` quando o dominio esta mapeado
- O mapeamento de campos do `organization_sites` para `PublicSiteConfig` ja existe em `PublishedSiteWrapper.tsx` -- sera reaproveitado
- Nenhuma alteracao em edge functions e necessaria, apenas no frontend
