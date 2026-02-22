
# Dominios Proprios via Cloudflare Workers

## Resumo

Substituir as instrucoes atuais de DNS (que apontam para IP do Lovable, que so funciona para 1 dominio) por instrucoes completas de Cloudflare Workers, permitindo que cada organizacao tenha seu proprio dominio apontando para o site publico.

## Alteracoes

### 1. Nova edge function: `get-worker-config`

**Arquivo novo**: `supabase/functions/get-worker-config/index.ts`

Endpoint publico que o Cloudflare Worker consulta para descobrir o slug de um dominio:
- Recebe `{ domain: "imobiliariaxyz.com.br" }`
- Busca na tabela `organization_sites` pelo `custom_domain`
- Retorna `{ slug: "imobiliaria-xyz", target: "vimobe.lovable.app" }`
- Sem autenticacao (precisa ser acessivel pelo Worker)

### 2. Registrar no config.toml

**Arquivo**: `supabase/config.toml`

Adicionar entrada `[functions.get-worker-config]` com `verify_jwt = false`.

### 3. Atualizar `resolve-site-domain`

**Arquivo**: `supabase/functions/resolve-site-domain/index.ts`

Adicionar busca direta na tabela `organization_sites` pelo campo `custom_domain` (alem do RPC existente), e incluir o `subdomain` (slug) na resposta.

### 4. Atualizar `verify-domain-dns`

**Arquivo**: `supabase/functions/verify-domain-dns/index.ts`

Adicionar verificacao alternativa: alem de checar se o DNS aponta para `185.158.133.1`, tambem verificar se o dominio responde via Cloudflare Worker chamando `get-worker-config`. Se qualquer um dos metodos confirmar, marca como verificado.

### 5. Reformular secao de Dominio no SiteSettings

**Arquivo**: `src/pages/SiteSettings.tsx`

Substituir o card atual de "Configuracao DNS" (que mostra registros A para 185.158.133.1) por instrucoes completas de Cloudflare Workers:

- **Passo a passo numerado** com 5 etapas:
  1. Criar conta gratuita no Cloudflare
  2. Adicionar dominio no Cloudflare e mudar nameservers
  3. Ir em Workers and Routes e criar um novo Worker
  4. Colar o codigo do Worker (gerado automaticamente com o slug da organizacao)
  5. Configurar rota do Worker para o dominio

- **Codigo do Worker** gerado dinamicamente com o slug correto, com botao "Copiar Codigo"
- **Informacoes uteis**: SSL automatico, plano gratuito do Cloudflare, tempo de propagacao
- Link para dnschecker.org

Tambem atualizar a funcao `copyDnsInstructions` para copiar as novas instrucoes do Cloudflare.

### 6. Atualizar DnsVerificationStatus

**Arquivo**: `src/components/site/DnsVerificationStatus.tsx`

Melhorar mensagens quando a verificacao falha:
- Remover referencia ao IP `185.158.133.1` (ja que agora usa Cloudflare)
- Adicionar link para dnschecker.org
- Mensagem mais clara orientando a verificar o Cloudflare Worker

### 7. Atualizar PublicSiteContext

**Arquivo**: `src/contexts/PublicSiteContext.tsx`

Adicionar `vimobe.lovable.app` na lista de dominios ignorados para que o contexto funcione corretamente quando acessado via slug no dominio publicado.

## Detalhes tecnicos

### Codigo do Cloudflare Worker (template gerado para cada organizacao)

O sistema gera automaticamente o script com o slug correto:

```text
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const slug = 'SLUG-DA-ORGANIZACAO';
    const target = 'vimobe.lovable.app';

    const targetUrl = `https://${target}/sites/${slug}${url.pathname}${url.search}`;

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

### Fluxo completo

1. Usuario acessa `www.imobiliariaxyz.com.br`
2. Cloudflare intercepta (nameservers apontam para Cloudflare)
3. Worker faz proxy para `vimobe.lovable.app/sites/imobiliaria-xyz`
4. App renderiza o site publico da organizacao correta
5. URL na barra do navegador mostra `www.imobiliariaxyz.com.br/imoveis`
6. SSL automatico pelo Cloudflare

### Escalabilidade

- Plano gratuito Cloudflare: 100.000 requests/dia
- Cada Worker pode servir multiplos dominios
- Sem custo adicional de infraestrutura
- 50+ sites sem problema

### Arquivos novos
- `supabase/functions/get-worker-config/index.ts`

### Arquivos modificados
- `supabase/config.toml`
- `supabase/functions/resolve-site-domain/index.ts`
- `supabase/functions/verify-domain-dns/index.ts`
- `src/pages/SiteSettings.tsx`
- `src/components/site/DnsVerificationStatus.tsx`
- `src/contexts/PublicSiteContext.tsx`

### Sem alteracoes no banco de dados
A tabela `organization_sites` ja possui os campos `custom_domain`, `subdomain`, `domain_verified` e `domain_verified_at`.
