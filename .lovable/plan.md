
# Plano: Corrigir Campo de Texto e Melhorar Checkmarks do WhatsApp

## Problemas Identificados

### 1. Campo de texto não limpa após enviar
O problema está na função `handleSendMessage` em `FloatingChat.tsx`:

```typescript
// Código atual (linha 216-221)
await sendMessage.mutateAsync({
  conversation: activeConversation,
  text: messageText.trim()
});
setMessageText("");  // ← Limpa SÓ DEPOIS da mutação terminar
```

O campo só limpa quando o envio termina completamente. Se demorar, o usuário fica vendo o texto.

### 2. Checkmarks (✓✓)
O sistema JÁ tem a lógica de checkmarks implementada:
- ⏱ Relógio = pendente
- ✓ Um check = enviado
- ✓✓ Dois checks = entregue
- ✓✓ (azul) = lido

O problema é que você só vê um check porque o webhook de status (`MESSAGES_UPDATE`) pode não estar chegando corretamente do Evolution API.

---

## Solução

### Parte 1: Limpar campo imediatamente

Vou modificar `handleSendMessage` para:
1. Salvar o texto em variável local
2. Limpar o campo ANTES de enviar
3. Enviar a mensagem com o texto salvo

```typescript
const handleSendMessage = async () => {
  const textToSend = messageText.trim();
  if (!textToSend || !activeConversation) return;
  
  // Limpa IMEDIATAMENTE (antes do envio)
  setMessageText("");
  
  // Envia com o texto salvo
  await sendMessage.mutateAsync({
    conversation: activeConversation,
    text: textToSend
  });
};
```

### Parte 2: Garantir checkmarks funcionando

O código de status já está correto. Vou apenas:

1. **Verificar** se o realtime está recebendo updates de status
2. **Adicionar log** no console para debug se necessário
3. **Confirmar** que o webhook está configurado no Evolution API

A lógica atual de exibição:

```typescript
const getStatusIcon = (status: string) => {
  switch (status) {
    case "sent":      return <Check />;       // ✓
    case "delivered": return <CheckCheck />;  // ✓✓
    case "read":      return <CheckCheck className="text-blue-400" />; // ✓✓ azul
    default:          return <Clock />;       // ⏱
  }
};
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/chat/FloatingChat.tsx` | Limpar campo antes do envio |

---

## Comportamento Esperado

### Após a correção:

| Ação | Comportamento |
|------|---------------|
| Digitar mensagem | Campo mostra o texto |
| Clicar Enviar | Campo limpa IMEDIATAMENTE |
| Mensagem aparece | Com ícone de relógio (⏱) |
| Servidor confirma | Muda para 1 check (✓) |
| Destinatário recebe | Muda para 2 checks (✓✓) |
| Destinatário lê | 2 checks ficam azuis (✓✓) |

---

## Sobre os Checkmarks

O sistema já está preparado para mostrar dois risquinhos. Se você só está vendo um check, pode ser que:

1. **O Evolution API não está enviando** o evento `MESSAGES_UPDATE` (configuração do webhook)
2. **O destinatário não está online** (a mensagem foi entregue mas não lida)
3. **O realtime está funcionando** e o status vai atualizar quando o destinatário receber

Vou garantir que o código está 100% correto para receber e exibir os status quando chegarem.

---

## Resumo

Mudança simples e eficaz:
- Campo de texto limpa instantaneamente ao enviar
- Checkmarks já estão implementados e vão aparecer quando o Evolution API enviar os updates de status
