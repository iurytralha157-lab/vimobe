
# Plano: Corrigir Notificações Instantâneas e Push iOS

## Diagnóstico Completo

Após investigação, encontrei **dois problemas distintos**:

### Problema 1: Notificações demoram ~2 minutos
**Causa raiz**: A tabela `notifications` **não está habilitada para Supabase Realtime**.

O código usa Realtime para receber notificações instantâneas:
```javascript
supabase.channel('notifications-realtime-v3')
  .on('postgres_changes', { event: 'INSERT', table: 'notifications' })
```

Mas sem a tabela estar publicada no Realtime, isso não funciona. O sistema recorre ao fallback de polling a cada 30 segundos.

### Problema 2: Push no iPhone não funciona
**Causa**: Push Notifications nativas só funcionam em apps compilados via Capacitor. Se você está acessando pelo browser Safari no iPhone, push nativo não é possível.

**Opções para iOS:**
1. **Compilar o app como iOS nativo** - Requer Xcode/Mac e configuração APNs
2. **Usar Web Push (limitado no iOS)** - Safari 16.4+ suporta Web Push em PWAs instaladas

---

## Solução Proposta

### Etapa 1: Habilitar Realtime na tabela notifications (CRÍTICO)

Nova migration para adicionar a tabela à publicação Realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

Isso fará as notificações aparecerem **instantaneamente** (em ~100ms em vez de 30 segundos).

### Etapa 2: Adicionar Realtime para leads também

Para garantir que o pipeline atualize instantaneamente quando um novo lead chega:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;
```

### Etapa 3: Otimizar o hook de notificações

Melhorias no código:
- Aumentar logs para debug
- Garantir reconexão automática em caso de desconexão

---

## Sobre Push no iPhone

O push nativo para iOS requer:

1. **Conta Apple Developer** ($99/ano)
2. **Certificado APNs** configurado no Firebase Console
3. **Arquivo GoogleService-Info.plist** no projeto Xcode
4. **Compilação via Xcode** em um Mac

Se você quiser seguir por esse caminho, eu posso preparar instruções detalhadas. Mas isso está fora do que posso fazer diretamente no Lovable - requer configuração local.

**Alternativa simples**: Com o Realtime funcionando, as notificações no app aparecerão instantaneamente (com som e toast). Isso já resolve boa parte do problema imediato.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Habilitar Realtime nas tabelas |
| `src/hooks/use-notifications.ts` | Logs adicionais e tratamento de reconexão |

---

## Resultado Esperado

Após a implementação:
- ⚡ Notificações aparecem em **~100ms** (instantâneo)
- 🔔 Som de "cha-ching" toca imediatamente
- 🍞 Toast aparece na hora
- 📱 Push nativo pendente de configuração local (iOS)
