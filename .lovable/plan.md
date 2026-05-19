## Problema

Quando o usuário entra pelo Google em `www.nexoimoveisgo.com.br`, o site começa a abrir (header aparece), mas em seguida vira "site não encontrado". Mesmo problema afeta `aspeimoveis.com.br` e demais clientes white-label.

## Causa raiz

No banco, o `custom_domain` está salvo **sem** o `www` (ex.: `nexoimoveisgo.com.br`). Quando o navegador chega via `www.nexoimoveisgo.com.br`, o frontend chama a edge function `resolve-site-domain` passando `www.nexoimoveisgo.com.br` como hostname.

Dois bugs impedem a resolução:

1. **Edge function `resolve-site-domain`** monta a query como:
   ```
   custom_domain.eq.www.nexoimoveisgo.com.br
   custom_domain.eq.www.nexoimoveisgo.com.br   ← duplicado (faz strip do www e recoloca)
   ```
   Nunca tenta `custom_domain = nexoimoveisgo.com.br`, então não encontra o registro.

2. **Função SQL `resolve_site_domain`** (fallback) compara `custom_domain = p_domain` literalmente e, se falhar, usa `split_part(p_domain, '.', 1)` — que devolve `'www'` em vez de `'nexo'`. Falha do mesmo jeito.

Resultado: `PublicSiteContext` recebe `found: false`, define `error = 'Site não encontrado'`, e o layout (que já tinha pintado o header com fallbacks) troca para a tela de erro.

A mesma causa também explica a tela branca demorada em outros sites quando entram via `www` — o erro só aparece depois do round-trip à edge function falhar.

A função `get-worker-config` (Cloudflare) já trata os dois formatos corretamente, então o worker entrega o app normalmente — o problema é só na resolução client-side.

## Correções

### 1. `supabase/functions/resolve-site-domain/index.ts`
Normalizar o domínio para tentar três variantes em uma única query `.or(...)`:
- valor exato recebido
- versão sem `www.` no início
- versão com `www.` forçado

Também passar o domínio normalizado (sem www) para o RPC de fallback, em vez do valor cru.

### 2. Função SQL `resolve_site_domain` (migration)
Antes de buscar, normalizar `p_domain` retirando o prefixo `www.` opcional, e na query comparar `custom_domain IN (p_domain_clean, 'www.' || p_domain_clean)`. Ajustar também o `split_part` para usar o domínio limpo (pega o primeiro label sem ser `www`).

### 3. (Opcional, mesma migration) `PublicSiteContext`
Limpar o `sessionStorage` quando a resolução retornar erro, para não cachear o estado quebrado entre navegações. Hoje só cacheia em sucesso, mas garantir que requisições paralelas não disparem múltiplas chamadas que poderiam confundir o usuário.

## Validação

Depois do deploy:
1. Acessar `https://www.nexoimoveisgo.com.br` em aba anônima → deve carregar o site completo (não só header).
2. Acessar `https://nexoimoveisgo.com.br` (sem www) → continua funcionando.
3. Repetir com `aspeimoveis.com.br` e `www.aspeimoveis.com.br`.
4. Conferir logs de `resolve-site-domain` para garantir `found: true` nas duas variantes.

## Fora de escopo

- DNS / Cloudflare / Lovable Domains (já configurados — o worker está respondendo).
- Mudanças visuais no layout público.
- SEO/SSR de bots (a função `public-site-ssr` já trata `www.` corretamente).
