## Problema

As atualizações estão demorando para chegar aos usuários porque o app está configurado como PWA com Service Worker em modo `prompt`. Isso faz com que:

1. O Service Worker antigo continua servindo a versão em cache até que o usuário clique em "Atualizar Agora" no toast.
2. O toast só aparece depois que o SW detecta a nova versão (intervalo de 10 minutos), e muitos usuários ignoram o toast.
3. O `index.html` está sendo cacheado pelo Workbox via `navigateFallback`, então mesmo um F5 normal pode servir HTML antigo.
4. Por isso, abrir em janela anônima (sem SW registrado) é a única forma de ver a versão nova imediatamente.

## Objetivo

Garantir que toda atualização publicada chegue automaticamente para os usuários no próximo carregamento da página, sem necessidade de aba anônima ou clique manual.

## Plano de ação

### 1. Mudar estratégia de update do Service Worker para automática

No `vite.config.ts`:
- Trocar `registerType: 'prompt'` por `registerType: 'autoUpdate'`.
- Adicionar `skipWaiting: true` e `clientsClaim: true` no bloco `workbox` para que a nova versão assuma controle imediatamente.

### 2. Forçar HTML sempre via rede (NetworkFirst)

Adicionar um `runtimeCaching` para navegações HTML usando `NetworkFirst` com `networkTimeoutSeconds: 3`. Isso garante que o `index.html` sempre tente buscar a versão nova primeiro, caindo no cache só se estiver offline.

### 3. Atualizar o hook `usePwaUpdate` para recarregar automaticamente

Em `src/hooks/use-pwa-update.ts`:
- Em `onNeedRefresh`, ao invés de mostrar toast com botão, chamar `updateServiceWorker(true)` automaticamente e fazer `window.location.reload()` após limpar caches.
- Manter um toast curto e informativo ("Atualizando para a nova versão...") só para feedback visual de 1-2 segundos.
- Reduzir o intervalo de checagem de updates de 10 minutos para 2 minutos (`r.update()` a cada 2 min).
- Adicionar checagem de update também quando a aba volta a ficar visível (`visibilitychange`) e ao focar a janela.

### 4. Adicionar versão no build para invalidar cache

- Injetar a hash do build (já feita pelo Vite nos assets `.js`/`.css`) e garantir que `index.html` referencie sempre as versões novas.
- Adicionar header/meta para evitar cache agressivo do navegador no HTML caso algum proxy intermediário cacheie.

### 5. Limpeza única para usuários atuais

Adicionar no boot da aplicação (uma vez, controlado por flag em `localStorage`) uma rotina que:
- Desregistra Service Workers antigos existentes.
- Limpa todos os `caches` da Cache Storage API.
- Recarrega a página.

Isso garante que os usuários que estão presos numa versão antiga "destravem" no primeiro acesso após o deploy desta correção.

### Detalhes técnicos

```text
vite.config.ts
├── registerType: 'autoUpdate'
└── workbox:
    ├── skipWaiting: true
    ├── clientsClaim: true
    ├── cleanupOutdatedCaches: true
    └── runtimeCaching:
        └── HTML navigations → NetworkFirst (timeout 3s)

src/hooks/use-pwa-update.ts
├── onNeedRefresh → auto reload (sem prompt)
├── update interval: 10min → 2min
└── + listener visibilitychange/focus para forçar r.update()

src/main.tsx (ou App.tsx)
└── boot once: unregister old SWs + caches.delete + reload
    (controlado por flag de versão no localStorage)
```

### Fora do escopo

- Não vamos remover o PWA — a instalação no celular continua funcionando.
- Não vamos mexer em notificações push (`sw-push.js`) nem no fluxo de instalação.
- Sem mudanças visuais/UI além do toast curto de "atualizando".

## Resultado esperado

Após aplicar:
- Toda nova publicação será carregada automaticamente em até ~2 minutos para abas abertas, e imediatamente para qualquer novo carregamento/refresh.
- Não será mais necessário usar aba anônima.
- Usuários presos em versões antigas serão destravados automaticamente uma vez após esta correção.