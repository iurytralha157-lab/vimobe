
# Corrigir Tela Branca em Dominios Customizados

## Problema
O `LanguageProvider` (linha 15 de `LanguageContext.tsx`) chama `useAuth()` que lanca erro fatal quando nao ha `AuthProvider` acima na arvore -- exatamente o que acontece no branch de dominio customizado do `App.tsx` (linhas 318-321).

## Alteracoes

### 1. `src/contexts/AuthContext.tsx` (linha 58)
Exportar o contexto para uso direto:
- De: `const AuthContext = createContext<AuthContextType | undefined>(undefined);`
- Para: `export const AuthContext = createContext<AuthContextType | undefined>(undefined);`

### 2. `src/contexts/LanguageContext.tsx` (linhas 3 e 15)
Substituir `useAuth()` por acesso direto ao contexto (que retorna `undefined` em vez de lancar erro quando fora do provider):
- Linha 3: trocar `import { useAuth } from './AuthContext'` por `import { AuthContext } from './AuthContext'`
- Linha 15: trocar `const { profile, user } = useAuth()` por:
```
const auth = useContext(AuthContext);
const profile = auth?.profile ?? null;
const user = auth?.user ?? null;
```

O resto do codigo ja usa optional chaining (`profile?.language`, `user?.id`) entao funciona sem alteracoes adicionais.
