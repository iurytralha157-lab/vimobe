
# Correcao da Sincronizacao com Google Calendar

## Problema Identificado

A edge function `google-calendar-sync` tem um bug critico: ela tenta ler a coluna `token_expires_at` da tabela `google_calendar_tokens`, mas a coluna real no banco de dados se chama `expires_at`. Isso faz com que a verificacao de token expirado sempre falhe, e a sincronizacao nunca funciona.

Alem disso, nao ha nenhum log registrado para essa funcao, confirmando que ela falha silenciosamente (o frontend captura o erro com try/catch e nao mostra nada ao usuario).

## O que sera corrigido

### 1. Corrigir nome da coluna na edge function

No arquivo `supabase/functions/google-calendar-sync/index.ts`:
- Linha 57: trocar `tokenData.token_expires_at` por `tokenData.expires_at`
- Linha 39: trocar `token_expires_at: expiresAt` por `expires_at: expiresAt`

### 2. Melhorar logs de erro no frontend

No arquivo `src/hooks/use-schedule-events.ts`, a funcao `syncWithGoogleCalendar` captura erros silenciosamente com `console.warn`. Vamos adicionar um toast de aviso quando a sincronizacao falhar, para que o usuario saiba que o evento foi salvo localmente mas nao foi enviado ao Google Calendar.

## Detalhes Tecnicos

### Arquivo: `supabase/functions/google-calendar-sync/index.ts`

Duas alteracoes pontuais:

1. Na funcao `refreshAccessToken` (linha 39):
   - De: `token_expires_at: expiresAt`
   - Para: `expires_at: expiresAt`

2. Na funcao `getValidAccessToken` (linha 57):
   - De: `const expiresAt = new Date(tokenData.token_expires_at)`
   - Para: `const expiresAt = new Date(tokenData.expires_at)`

### Arquivo: `src/hooks/use-schedule-events.ts`

Adicionar `toast.warning()` no catch da funcao `syncWithGoogleCalendar` para informar o usuario quando a sincronizacao falhar, em vez de silenciar completamente o erro.
