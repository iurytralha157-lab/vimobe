
# Corrigir Tela Branca em Dominios Customizados

## Problema
Quando o site e acessado via dominio customizado, o app mostra tela branca por causa de um erro:
**"useAuth must be used within an AuthProvider"**

A causa: no `App.tsx` (linha 318-321), o branch de dominio customizado envolve `CustomDomainRoutes` com `LanguageProvider`, mas **sem** `AuthProvider`. Porem, `LanguageProvider` chama `useAuth()` internamente (linha 15 de `LanguageContext.tsx`), o que causa o crash.

O erro de CORS do `~api/analytics` e do proprio Lovable (plataforma), nao do codigo do app -- nao precisa de correcao no codigo.

## Solucao

### Opcao escolhida: Tornar LanguageProvider resiliente a ausencia de AuthProvider

Em vez de adicionar AuthProvider inteiro no branch de dominio customizado (que traria overhead desnecessario -- auth nao e usado em sites publicos), vamos fazer o `LanguageProvider` funcionar sem auth.

### Arquivo: `src/contexts/LanguageContext.tsx`

Trocar a chamada direta `useAuth()` por uma versao segura que retorna `null` quando nao ha AuthProvider:

1. Criar um hook interno `useOptionalAuth()` que usa `useContext(AuthContext)` diretamente e retorna `undefined` quando o provider nao existe (em vez de lancar erro)
2. Usar `profile?.language` e `user?.id` com optional chaining -- ja funciona porque os valores serao `undefined`

Mudanca concreta:
- Remover `import { useAuth } from './AuthContext'`
- Importar o `AuthContext` diretamente (o contexto React, nao o hook)
- Usar `useContext(AuthContext)` que retorna `undefined` quando fora do provider (sem throw)
- Extrair `profile` e `user` com fallback: `const auth = useContext(AuthContext); const profile = auth?.profile; const user = auth?.user;`

Nenhum outro arquivo precisa ser alterado. O `LanguageProvider` continuara funcionando normalmente quando dentro do `AuthProvider` (app principal) e usara apenas localStorage quando fora dele (dominio customizado).
