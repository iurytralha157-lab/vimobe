

# Corrigir Tela Branca em Dominios Customizados

## Problema
O `LanguageProvider` chama `useAuth()` que lanca erro quando nao existe `AuthProvider` — exatamente o caso no branch de dominio customizado do `App.tsx`.

## Solucao

### Arquivo 1: `src/contexts/AuthContext.tsx`
- Exportar o `AuthContext` (linha 58): trocar `const AuthContext` por `export const AuthContext`

### Arquivo 2: `src/contexts/LanguageContext.tsx`
- Trocar `import { useAuth } from './AuthContext'` por `import { AuthContext } from './AuthContext'`
- Na linha 16, trocar `const { profile, user } = useAuth()` por:
  ```
  const auth = useContext(AuthContext);
  const profile = auth?.profile;
  const user = auth?.user;
  ```

Nenhuma outra alteracao necessaria. O optional chaining ja existente no restante do codigo (`profile?.language`, `user?.id`) garante que tudo funciona com valores `undefined`.

