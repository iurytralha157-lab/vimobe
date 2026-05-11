O usuário deseja que o sistema seja atualizado (limpeza de cache) sempre que um usuário deslogar, garantindo que a próxima sessão comece com os arquivos e estados mais recentes.

Atualmente, o `signOut` faz um redirecionamento simples. Vou implementar uma limpeza profunda de cache (Service Workers, Cache Storage, LocalStorage) durante o processo de logout.

### Plano de Implementação:

1.  **Refatorar utilitário de limpeza de cache**:
    *   Mover a lógica de `performFullCacheClear` de `src/hooks/use-force-refresh.ts` para um novo arquivo utilitário `src/lib/cache-utils.ts` para que possa ser compartilhado entre o hook de atualização forçada e o contexto de autenticação.
    *   Adicionar uma opção para limpar também os tokens de autenticação (necessário para o logout).

2.  **Atualizar `src/contexts/AuthContext.tsx`**:
    *   Importar o novo utilitário de limpeza.
    *   Modificar a função `signOut` para executar a limpeza completa antes do redirecionamento.
    *   Garantir que o redirecionamento para `/auth` use um parâmetro de bust de cache (ex: `?v=timestamp`).

3.  **Verificar consistência**:
    *   Garantir que o script no `index.html` e a lógica do `AuthContext` estejam alinhados quanto às chaves do Supabase.

### Detalhes técnicos:
*   Arquivo novo: `src/lib/cache-utils.ts`.
*   A limpeza incluirá `navigator.serviceWorker.getRegistrations()`, `window.caches.keys()`, `localStorage.clear()` (ou remoção seletiva) e `sessionStorage.clear()`.
*   O redirecionamento final usará `window.location.replace('/auth?v=' + Date.now())`.
