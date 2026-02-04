

# Plano: Implementação de Web Push Notifications

## Contexto Atual

O projeto já possui uma estrutura sólida de push notifications para **apps nativos** (Capacitor/FCM), mas não tem suporte para **Web Push** (navegadores). Vou implementar Web Push usando VAPID keys para que usuários no navegador também recebam notificações mesmo com a aba fechada.

### O que já existe:
| Componente | Status | Descrição |
|------------|--------|-----------|
| `push_tokens` table | Existe | Tabela com colunas: user_id, token, platform, is_active |
| `send-push-notification` Edge Function | Existe | Envia via FCM (para apps nativos) |
| `usePushNotifications` hook | Existe | Apenas para Capacitor (ignora web) |
| VAPID Keys | Não existe | Precisa adicionar |
| Service Worker Push | Não existe | Precisa criar |
| Web Push Hook | Não existe | Precisa criar |
| Prompt UI | Não existe | Precisa criar |

---

## Arquitetura Web Push

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Navegador     │────▶│  Supabase Edge   │────▶│  Push Service   │
│   (Frontend)    │     │  Function        │     │  (Web Push)     │
│                 │◀────│                  │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        ▼                        ▼
 Service Worker           VAPID Auth
  (sw-push.js)        (Private/Public Keys)
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/use-web-push.ts` | Criar | Hook para gerenciar Web Push |
| `src/components/pwa/WebPushPrompt.tsx` | Criar | Popup para solicitar permissão |
| `public/sw-push.js` | Criar | Service Worker para push |
| `vite.config.ts` | Modificar | Incluir sw-push.js no build |
| `src/components/layout/AppLayout.tsx` | Modificar | Adicionar WebPushPrompt |
| `supabase/functions/send-push-notification/index.ts` | Modificar | Adicionar suporte a Web Push via VAPID |

---

## Implementação Detalhada

### 1. Criar Hook `use-web-push.ts`

```typescript
// Funcionalidades:
// - Detectar suporte a Web Push (navigator.serviceWorker + PushManager)
// - Solicitar permissão (Notification.requestPermission)
// - Criar subscription (pushManager.subscribe com VAPID key)
// - Salvar subscription no Supabase (tabela push_tokens com platform='web')
// - Gerenciar estado (isSubscribed, isSupported, etc)
```

O hook vai:
1. Verificar se o navegador suporta Web Push
2. Registrar o Service Worker se ainda não estiver
3. Obter ou criar a subscription usando a VAPID public key
4. Salvar no banco (mesma tabela `push_tokens`, platform='web')

### 2. Criar Service Worker `public/sw-push.js`

```javascript
// Listener para evento 'push'
self.addEventListener('push', function(event) {
  const data = event.data?.json() || {};
  const title = data.title || 'Nova notificação';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Listener para clique na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

### 3. Criar Componente `WebPushPrompt.tsx`

UI similar ao InstallPrompt existente:
- Banner fixo no bottom pedindo permissão
- Botão "Ativar notificações" 
- Botão X para dispensar
- Persistir dismiss no localStorage por 7 dias
- Só mostrar se: Web Push suportado + não inscrito + não dispensado

### 4. Atualizar `vite.config.ts`

```typescript
VitePWA({
  // ... config existente ...
  workbox: {
    // ... config existente ...
    // Adicionar:
    importScripts: ['/sw-push.js'],
  },
})
```

Isso faz com que o Workbox (service worker do PWA) importe nosso código de push.

### 5. Atualizar Edge Function para Web Push

A edge function atual usa FCM para apps nativos. Para Web Push, precisamos enviar via protocolo Web Push (RFC 8030) usando as VAPID keys.

```typescript
// Detectar platform na tabela
if (tokenRecord.platform === 'web') {
  // Enviar via Web Push (webpush library)
  await sendWebPush(tokenRecord.token, title, body, data);
} else {
  // Enviar via FCM (código atual)
  await sendFCMNotification(tokenRecord.token, ...);
}
```

### 6. Atualizar AppLayout

```tsx
import { WebPushPrompt } from '@/components/pwa/WebPushPrompt';

// Dentro do componente:
<WebPushPrompt />
```

---

## Secrets Necessários

| Nome | Onde adicionar | Valor |
|------|----------------|-------|
| `VITE_VAPID_PUBLIC_KEY` | `.env` (frontend) | A chave pública VAPID fornecida |
| `VAPID_PRIVATE_KEY` | Supabase Secrets | A chave privada VAPID fornecida |

A chave pública pode ficar no código (é pública mesmo), mas vou usar env var para facilitar troca futura.

---

## Fluxo do Usuário

```text
1. Usuário abre o app no navegador (desktop/mobile)
           ↓
2. WebPushPrompt aparece (se não inscrito e não dispensado)
           ↓
3. Usuário clica "Ativar notificações"
           ↓
4. Browser pede permissão nativa
           ↓
5. Se aceito:
   - Service Worker registra subscription
   - Hook salva no Supabase (push_tokens, platform='web')
           ↓
6. Quando um evento dispara notificação:
   - Edge function busca tokens do user
   - Para platform='web': envia via Web Push protocol
   - Service Worker recebe e mostra
           ↓
7. Usuário clica na notificação → abre o app na URL correta
```

---

## Seção Técnica

### Estrutura do Token Web Push

O token Web Push é um objeto JSON com:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

Vamos salvar como JSON string na coluna `token` da tabela `push_tokens`.

### Biblioteca Web Push no Edge Function

Usaremos a implementação manual do protocolo Web Push (VAPID + ECDH encryption) pois não há biblioteca Deno nativa disponível. Alternativa: usar um serviço intermediário ou implementar os headers VAPID manualmente.

### Diferença FCM vs Web Push

| Aspecto | FCM (Atual) | Web Push (Novo) |
|---------|-------------|-----------------|
| Platform | Android/iOS nativos | Navegadores |
| Auth | Firebase Service Account | VAPID Keys |
| Protocol | FCM HTTP v1 | RFC 8030 + RFC 8291 |
| Token | FCM Registration Token | PushSubscription Object |

### Compatibilidade

| Navegador | Suporte |
|-----------|---------|
| Chrome (desktop) | Sim |
| Chrome (Android) | Sim |
| Firefox | Sim |
| Edge | Sim |
| Safari (macOS 13+) | Sim |
| Safari (iOS 16.4+) | Sim (PWA instalado) |

