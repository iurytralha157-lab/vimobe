
# Usar campo WhatsApp ao inves de Telefone para notificacoes

## Problema

1. A Edge Function `whatsapp-notifier` busca `users.phone` para enviar notificacoes, mas o campo correto e `users.whatsapp` (configurado em Configuracoes > Conta)
2. O lembrete de cadastro (`usePhoneReminder`) pede para atualizar o telefone, mas deveria pedir para atualizar o WhatsApp

## Mudancas

### 1. `supabase/functions/whatsapp-notifier/index.ts`

- Linha 72: Trocar `.select("phone, name")` por `.select("whatsapp, name")`
- Linha 76: Trocar `!user?.phone` por `!user?.whatsapp`
- Linha 79: Trocar mensagem de erro para `"User has no WhatsApp number"`
- Linha 85: Trocar `user.phone` por `user.whatsapp` na formatacao do numero

### 2. `src/hooks/use-phone-reminder.ts`

- Linha 10: Trocar `profile.phone` por `profile.whatsapp`
- Linha 20: Trocar titulo para `"📱 Atualize seu WhatsApp"`
- Linha 21: Trocar conteudo para `"Cadastre seu numero de WhatsApp em Configuracoes > Conta para receber notificacoes importantes."`
- Linha 31: Trocar dependencia para `profile?.whatsapp`

### 3. `supabase/functions/whatsapp-notifier/index.ts` - log

- Linha 90: Trocar `phone: formattedPhone` para manter consistencia no log
