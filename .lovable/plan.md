## Diagnóstico

Após você fazer login, o sistema fica travado em "carregando" porque a chamada `checkSuperAdmin()` no `AuthContext` **dá timeout de 5 segundos** e bloqueia toda a sequência de inicialização.

### Causa Raiz: RLS recursiva na tabela `user_roles`

Investiguei as políticas da tabela `public.user_roles` no banco e encontrei isto:

```text
Política SELECT: "Users can view roles in org"
  qual: user_id IN (SELECT id FROM users WHERE organization_id = get_user_organization_id())
```

O problema:
1. O frontend chama `SELECT role FROM user_roles WHERE user_id = ... AND role = 'super_admin'`
2. A política de SELECT exige consultar a tabela `users` para descobrir a organização do usuário
3. A função `get_user_organization_id()` provavelmente também faz lookups em `users`/`user_roles`
4. Isso cria uma cadeia de subqueries pesada que **nunca retorna em < 5s** → timeout

Logs confirmam:
```
[Performance] checkSuperAdmin: 5002.59ms
Error checking super admin (or timeout): Timeout checking super admin
```

Como `fetchProfile` aguarda `Promise.all([userResult, checkSuperAdmin])`, o perfil só é setado depois do timeout — e a UI fica em `<PageLoader />` esperando, dando a sensação de loop.

### Erros Secundários (consequência do principal)

- **401 em `audit_logs`**: tentativas de log antes da sessão estar pronta (RLS bloqueia inserts anônimos). Não-fatal.
- **404 e chunks falhando em `vimob.vettercompany.com.br`**: o domínio customizado (Cloudflare Worker) está servindo chunks antigos/cacheados (`bad-precaching-response :: status 524`). Isso é cache do PWA/Service Worker, separado do problema de auth.
- **Warning "Function components cannot be given refs"** no `TrialExpiredModal`: cosmético, mas devo corrigir.

## Plano de Correção

### 1. Resolver a recursão RLS em `user_roles` (causa raiz)

Criar migração que substitui a política SELECT atual por uma que **não dependa de subqueries em `users`**:

- Adicionar política simples: `auth.uid() = user_id` (usuário sempre pode ler suas próprias roles).
- Manter a política existente de admins gerenciar (`is_admin()`).
- Remover a política recursiva "Users can view roles in org" (ou restringir a `is_admin()` apenas).

Isso elimina o timeout: a query do `checkSuperAdmin` retornará em milissegundos.

### 2. Endurecer o `AuthContext` para nunca travar a UI

Em `src/contexts/AuthContext.tsx`:

- Reduzir o timeout do `checkSuperAdmin` de 5s para 2s (defesa em profundidade).
- No `fetchProfile`, **não bloquear** o set do perfil esperando `checkSuperAdmin`: setar o perfil imediatamente quando o `userResult` chegar e atualizar `isSuperAdmin` quando a verificação concluir (ou falhar silenciosamente).
- Garantir que `setLoading(false)` seja chamado mesmo quando `fetchProfile` falha em qualquer ramo.

### 3. Silenciar tentativas de audit log sem sessão

Em `src/hooks/use-audit-logs.ts`: pular o insert se `auth.uid()` for null, evitando os 401 ruidosos no console.

### 4. Corrigir warning do `TrialExpiredModal`

Remover o `lazy()` desnecessário ou envolver o componente com `React.forwardRef` para silenciar o warning de ref. Solução mais simples: importar o componente diretamente (não é uma rota, é um modal que monta sempre).

### 5. Forçar invalidação de cache do PWA no domínio customizado

Para os erros `Failed to fetch dynamically imported module` no `vimob.vettercompany.com.br`: bumpar a versão do service worker / cache do PWA para os clientes baixarem os chunks novos. Isso é independente, mas resolve a tela branca em produção.

## Arquivos Afetados

- **Nova migração SQL**: políticas RLS de `public.user_roles`
- `src/contexts/AuthContext.tsx`: timeout + ordem do set state
- `src/hooks/use-audit-logs.ts`: guard para sessão
- `src/App.tsx`: importação direta do `TrialExpiredModal`
- `src/hooks/use-pwa-update.ts` (ou similar): bump de versão do SW

## Por que isso vai resolver

O carregamento infinito acontece **toda** vez porque a política RLS atual sempre causa timeout — não é intermitente, é determinístico. Removendo a recursão, o `checkSuperAdmin` retorna em ~50ms, o `fetchProfile` completa, `setLoading(false)` dispara, e o `ProtectedRoute` libera a navegação para `/dashboard` imediatamente.
