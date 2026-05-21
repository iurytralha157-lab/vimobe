## Diagnóstico

Pelos logs do console:

```
getSession started
Auth event: SIGNED_IN Session: true
... (silêncio por 5 segundos) ...
Auth safety timeout reached - forcing all loading states to complete
```

O `supabase.auth.getSession()` **nunca resolve** (não loga "getSession finished"), e a checagem de organizações nunca roda. Só o fallback de segurança de 5s libera a tela — e mesmo assim sem `profile` nem `organization`, o que faz qualquer rota protegida redirecionar para `/select-organization`, onde o `useUserOrganizations` também trava (mesma causa).

### Causa raiz

Em `src/contexts/AuthContext.tsx`, o handler `onAuthStateChange` faz chamadas `await` ao Supabase dentro do próprio callback:

```ts
supabase.auth.onAuthStateChange(async (event, session) => {
  ...
  if (authEvent === 'SIGNED_IN' || ...) {
    await fetchProfile(session.user.id); // ← deadlock
  }
})
```

Isso é o bug clássico documentado pelo Supabase: chamadas async ao próprio cliente Supabase dentro de `onAuthStateChange` **deadlockam** com `getSession()` e com queries do PostgREST que dependem do token. Por isso `getSession` nunca termina e as queries de profile/organizações ficam penduradas. Foi introduzido pelos últimos ajustes de organização.

## Correção

Arquivo: `src/contexts/AuthContext.tsx`

1. No callback de `onAuthStateChange`, NUNCA usar `await` com chamadas Supabase. Sincronizar apenas estado (`setSession`, `setUser`) imediatamente e adiar qualquer chamada (`fetchProfile`, `checkMultiOrg`) com `setTimeout(() => {...}, 0)`.
2. Garantir que `fetchProfile` e `checkMultiOrg` no SIGNED_IN também atualizem `organizationsLoaded` corretamente (mesma sequência do fluxo inicial do `getSession`), para que o redirect para `/dashboard` aconteça com `profile` e `organization` já carregados.
3. Remover o `await fetchProfile` em `TOKEN_REFRESHED` (não precisa refazer fetch a cada refresh de token).
4. Manter o safety timeout de 5s como rede de segurança, mas com a correção ele não deve mais ser acionado em fluxo normal.

## Verificação após implementar

- Recarregar `/auth` logado → deve logar "getSession finished" em menos de 1s, redirecionar direto para `/dashboard` com organização ativa.
- Recarregar `/dashboard` → mantém na dashboard, sem voltar para `/select-organization`.
- Recarregar `/auth` deslogado → mostra tela de login imediatamente.
- Conferir que o log "Auth safety timeout reached" não aparece mais.

## Não será alterado

- Lógica de filtros do Dashboard
- Evolution / Evolution Go
- Meta, RLS, edge functions, schema do banco
- Componentes mobile
