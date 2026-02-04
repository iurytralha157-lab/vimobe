
# Plano: Corrigir Ativação de Notificações Web Push

## Diagnóstico do Problema

Ao clicar em "Ativar", o botão mostra "Ativando..." mas a função `subscribe()` falha silenciosamente por dois motivos:

### 1. Chave VAPID em Formato Incorreto
A chave pública VAPID atual no `.env`:
```
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWjUfBw5nc02KFFL6pr1jM51bHv0CllEuy5ypnldeYLMhYSbQbKlWHK7T9VK1CF2xVgH_9HOc3tavj0iuT1mEzA
```

Esta é uma chave EC em formato **SubjectPublicKeyInfo (SPKI)** base64. Porém, o `PushManager.subscribe()` espera uma chave em formato **raw uncompressed point** (65 bytes, começando com 0x04).

O erro ocorre na linha:
```typescript
applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
```

### 2. Falha Silenciosa
O componente `WebPushPrompt` não exibe mensagem de erro quando `subscribe()` retorna `false`, simplesmente mantém o prompt visível sem feedback.

---

## Solução

### Parte 1: Extrair a Chave Raw do SPKI

Modificar a função `urlBase64ToUint8Array` no hook `use-web-push.ts` para detectar e extrair a chave raw de um SPKI:

```typescript
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  // Se a chave for maior que 65 bytes, provavelmente é SPKI
  // A chave raw EC P-256 está nos últimos 65 bytes do SPKI
  if (outputArray.length > 65) {
    // SPKI para EC P-256 tem 91 bytes, a chave raw começa no byte 26
    const rawKey = outputArray.slice(-65);
    return rawKey.buffer as ArrayBuffer;
  }

  return outputArray.buffer as ArrayBuffer;
}
```

### Parte 2: Adicionar Feedback de Erro no Componente

Modificar `WebPushPrompt.tsx` para mostrar um toast de erro quando a ativação falhar:

```typescript
import { toast } from 'sonner';

const handleEnable = async () => {
  setIsSubscribing(true);
  
  const success = await subscribe();
  
  setIsSubscribing(false);
  
  if (success) {
    toast.success('Notificações ativadas com sucesso!');
    setShowPrompt(false);
  } else {
    toast.error('Não foi possível ativar as notificações. Verifique as permissões do navegador.');
  }
};
```

### Parte 3: Adicionar Logs para Debug

Adicionar console.log no hook para facilitar diagnóstico:

```typescript
const subscribe = useCallback(async (): Promise<boolean> => {
  console.log('[WebPush] Iniciando subscription...');
  console.log('[WebPush] VAPID key length:', VAPID_PUBLIC_KEY.length);
  
  // ... resto do código com logs em cada etapa
}, [saveSubscription]);
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-web-push.ts` | Corrigir extração da chave VAPID do formato SPKI |
| `src/components/pwa/WebPushPrompt.tsx` | Adicionar feedback visual de sucesso/erro |

---

## Fluxo Corrigido

```text
1. Usuário clica "Ativar"
2. Botão mostra "Ativando..."
3. Solicita permissão do navegador
4. Se permitido:
   a. Aguarda Service Worker estar pronto
   b. Converte chave VAPID (extraindo do SPKI se necessário)
   c. Cria subscription com PushManager
   d. Salva subscription no Supabase
   e. Mostra toast de sucesso
5. Se erro:
   a. Mostra toast de erro
   b. Loga detalhes no console
```

---

## Validação

Após a correção:
1. O botão "Ativar" deve funcionar completamente
2. O navegador deve solicitar permissão para notificações
3. Mensagem de sucesso ou erro deve aparecer
4. Se sucesso, prompt deve desaparecer
5. Subscription deve ser salva na tabela `push_tokens`
