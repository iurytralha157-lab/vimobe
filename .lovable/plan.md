Plano de correção para notificações no celular

O erro do print é:

```text
Erro ao ativar notificações: Subscribing for push requires an active service worker
```

Isso significa que o app está tentando criar a inscrição de push antes de existir um Service Worker realmente ativo/controlando a página. Hoje o código até tenta aguardar o Service Worker, mas tem dois problemas principais:

1. Ele pode pegar um registro existente que ainda não está `active`.
2. Ele tenta registrar manualmente `/sw-push.js`, mas esse arquivo é apenas o script de eventos de push, não o Service Worker principal gerado pelo `vite-plugin-pwa`. Assim, o browser aceita o registro, mas ele ainda pode não estar no estado correto para `pushManager.subscribe()`.

Também encontrei uma duplicidade importante: existem dois hooks com nomes quase iguais:

- `src/hooks/usePushNotifications.ts`: usado na aba Configurações > Notificações, para Web Push/PWA.
- `src/hooks/use-push-notifications.ts`: usado no layout para Capacitor/notificação nativa.

Isso deixa o fluxo confuso e aumenta a chance de o app ativar a estratégia errada.

Objetivo

Fazer o botão “Ativar Agora” funcionar no PWA instalado no celular, salvando a assinatura em `push_subscriptions`, e preparar o fluxo para notificações nativas via Capacitor quando o app for empacotado como aplicativo real.

Escopo da correção

1. Corrigir o registro do Service Worker PWA
   - Remover a tentativa de registrar `/sw-push.js` diretamente como Service Worker principal.
   - Usar o Service Worker gerado pelo `vite-plugin-pwa` como origem oficial.
   - Manter `sw-push.js` apenas como script importado pelo Workbox para tratar `push` e `notificationclick`.
   - Garantir que o Service Worker esteja `active` antes de chamar `registration.pushManager.subscribe()`.

2. Criar uma função robusta para aguardar Service Worker ativo
   - Implementar uma rotina do tipo `getActiveServiceWorkerRegistration()` que:
     - verifica `navigator.serviceWorker.ready`;
     - valida `registration.active`;
     - verifica `registration.installing` e `registration.waiting`;
     - aguarda mudança de estado para `activated`;
     - chama `registration.update()` quando necessário;
     - falha com uma mensagem clara se não houver Service Worker ativo.
   - Isso corrige especificamente o erro do print.

3. Ajustar o fluxo de ativação no hook Web Push
   - Em `src/hooks/usePushNotifications.ts`, alterar o fluxo para:
     - checar suporte real a `Notification`, `serviceWorker` e `PushManager`;
     - pedir permissão somente a partir do clique do usuário;
     - aguardar Service Worker ativo;
     - usar somente uma `ServiceWorkerRegistration` ativa;
     - só então chamar `pushManager.subscribe()`.
   - Se houver assinatura existente, sincronizar com o banco novamente.
   - Se der erro, exibir mensagem em português explicando se precisa recarregar, reinstalar o PWA ou publicar a nova versão.

4. Corrigir a sincronização com o banco
   - Conferir se `push_subscriptions` recebe `user_id`, `subscription` e `updated_at` corretamente.
   - Após ativar, chamar novamente a função de sincronização para garantir que o registro apareça no banco.
   - Ajustar o botão “Sincronizar” para não apenas ler a assinatura local, mas também reenviar a assinatura existente para o backend.
   - Isso resolve o problema anterior em que o teste retornava “No subscription found”.

5. Unificar e nomear melhor os fluxos Web Push vs Nativo
   - Evitar confusão entre `usePushNotifications.ts` e `use-push-notifications.ts`.
   - Manter claro:
     - Web/PWA instalado: usa Service Worker + `push_subscriptions`.
     - App nativo Capacitor: usa `@capacitor/push-notifications` + `push_tokens`.
   - A aba de configurações deve informar qual modo está sendo usado no dispositivo atual.

6. Ajustar configuração PWA
   - Adicionar proteções recomendadas no `vite.config.ts`:
     - manter Service Worker desativado no ambiente de desenvolvimento/editor;
     - adicionar `/~oauth` no `navigateFallbackDenylist` para não quebrar OAuth;
     - manter o comportamento funcionando apenas no app publicado/instalado.
   - Avaliar `registerType`: para esse caso, `autoUpdate` tende a reduzir versão antiga presa no celular. Se mantivermos `prompt`, precisa haver uma ação clara de atualização.

7. Preparar o disparo de teste
   - Corrigir o botão “Enviar Teste” para chamar a função correta e interpretar retorno `success: false` como erro visível.
   - Hoje o teste pode retornar HTTP 200 com `{ success: false, message: "No subscription found" }`, e isso precisa aparecer corretamente na interface.
   - Após a correção, o teste deve confirmar:
     - assinatura salva em `push_subscriptions`;
     - edge function encontrou a assinatura;
     - envio do Web Push foi aceito.

8. Diagnóstico visual para o usuário
   - Adicionar, na aba de notificações, um pequeno status técnico simples:
     - “Permissão: concedida/bloqueada/pendente”
     - “Service Worker: ativo/não ativo”
     - “Assinatura: sincronizada/não sincronizada”
   - Isso ajuda a identificar rapidamente onde falhou sem depender só do toast.

Notas importantes sobre notificações no celular

- Para PWA no iPhone, notificações Web Push só funcionam quando o app foi adicionado à Tela de Início e aberto como app instalado.
- Em iOS antigo abaixo de 16.4, Web Push não funciona.
- Para “notificação nativa de verdade” publicada na App Store/Play Store, o caminho correto é Capacitor + push nativo, que já existe parcialmente no projeto, mas exige configuração externa de Firebase/APNs e sincronização com `npx cap sync` no projeto exportado.

Resultado esperado depois da implementação

- Ao tocar em “Ativar Agora”, o app não deve mais mostrar “requires an active service worker”.
- O banco deve receber uma linha em `push_subscriptions` para o usuário.
- O botão “Enviar Teste” deve disparar uma notificação no celular quando o app estiver instalado como PWA.
- Se o dispositivo não suportar, a interface vai explicar exatamente o motivo.

Depois de aprovar este plano, faço a correção no código.