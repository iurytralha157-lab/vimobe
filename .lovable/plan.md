
# Corrigir Mensagem de Erro Genérica no Envio de WhatsApp

## Problema

Quando o envio de mensagem falha (ex: número não está no WhatsApp, sessão desconectada), o usuário vê apenas "Edge Function returned a non-2xx status code" ao invés da mensagem real do erro.

**Causa raiz**: O `evolution-proxy` retorna HTTP 400 para erros de negócio (linha 116). O `supabase.functions.invoke()` intercepta qualquer resposta non-2xx e lança um erro genérico, descartando o body com a mensagem real.

**Teste realizado**: Chamei diretamente o `evolution-proxy` com o número do WYLDSON (556194306295) e a Evolution API retornou: "Número 556194306295 não está registrado no WhatsApp". Esta mensagem nunca chega ao frontend.

## Solucao

### 1. `supabase/functions/evolution-proxy/index.ts` (1 linha)

Mudar a linha 116 para sempre retornar HTTP 200, delegando o controle de erro ao campo `success`:

```
// ANTES (linha 116):
status: result.success ? 200 : 400,

// DEPOIS:
status: 200,
```

Isso garante que `supabase.functions.invoke()` nao lance erro genérico, e o código no frontend (linha 451-452 de `use-whatsapp-conversations.ts`) ja trata corretamente:

```typescript
if (!data.success) throw new Error(data.error || "Failed to send message");
```

Assim, o `onError` do mutation exibira a mensagem real ("Número não está registrado", "Session not connected", etc.) com tratamento adequado para cada tipo de erro (linhas 600-626).

### Arquivos afetados

- `supabase/functions/evolution-proxy/index.ts` - linha 116 (1 mudança)

### Resultado esperado

- Quando o número nao tem WhatsApp: "Contato sem WhatsApp - Este número não está no WhatsApp."
- Quando a sessão está desconectada: "WhatsApp Desconectado - Vá em Configurações e escaneie o QR Code."
- Outros erros: a mensagem real da Evolution API sera exibida
