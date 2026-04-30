## Por que o sistema ficou lento

Após investigar, identifiquei **3 causas principais** de lentidão introduzidas nas últimas alterações:

### 1. `refetchOnMount: false` quebrando o cache do React Query (App.tsx)
No `QueryClient` global foi adicionado `refetchOnMount: false`. Isso faz com que **toda navegação entre páginas** mantenha dados antigos em memória sem revalidar, mas também impede o uso correto de `staleTime` em hooks que dependem de filtros dinâmicos (Dashboard, KPIs, listagens). O resultado prático é que quando o usuário entra no Dashboard, várias queries disparam em paralelo (stats, evolução, propriedades, visitas, organização) sem um padrão consistente, sobrecarregando o backend e travando a UI.

### 2. `PageLoader = () => null` causando "tela branca + travamento"
No `App.tsx`, o `PageLoader` foi reduzido a `null`. Resultado:
- Durante o `Suspense` de páginas lazy, **nada é renderizado** — o navegador parece travar.
- Em `ProtectedRoute`, quando `loading=true` ou perfil ainda carregando, fica completamente em branco.
- O React continua processando o lazy chunk, dando sensação de "sistema lento" mesmo quando está só carregando.

### 3. Warning de ref em `KPICardSkeleton` (Dashboard)
Os logs mostram avisos repetidos:
> `Function components cannot be given refs. Check the render method of KPICardSkeleton`

Isso vem de `Tooltip` com `asChild` em volta de cards que renderizam o `Skeleton` sem `forwardRef`. Cada render do Dashboard (que tem 7+ skeletons) dispara o aviso, gera re-renders extras e suja o console — em dev isso é **muito custoso**.

### 4. Causas secundárias acumuladas
- `usePublicHomeData` + `useFeaturedProperties` + `useExclusiveProperties` + `usePropertyTypes` + `usePublicCities` + `usePublicNeighborhoods` no `PublicHome` — **6 queries paralelas** quando só `usePublicHomeData` já traz tudo (`featured`, `exclusive`, `latest`, `types`, `cities`).
- `Dashboard.tsx` faz uma query separada em `lead_events` carregando **todos os session_id** sem limite — em organizações com muito tráfego isso traz milhares de linhas só para contar sessões únicas (deveria ser RPC com `count distinct`).

---

## Plano de correção

### Passo 1 — Restaurar comportamento saudável do React Query (`src/App.tsx`)
- Remover `refetchOnMount: false` (manter `refetchOnWindowFocus: false`).
- Manter `staleTime: 5min` e `gcTime: 15min` (esses estão ok).

### Passo 2 — Restaurar um `PageLoader` mínimo e leve (`src/App.tsx`)
Voltar com um spinner simples (apenas um div com `animate-spin`, sem texto, sem fundo de tela cheia bloqueante):
```tsx
const PageLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);
```
Isso elimina a "tela branca" sem voltar à tela de carregamento bloqueante anterior.

### Passo 3 — Corrigir o warning de ref no Skeleton (`src/components/ui/skeleton.tsx`)
Converter `Skeleton` para `React.forwardRef`. Isso elimina os warnings em loop que estão poluindo o console e degradando a performance no dev.

### Passo 4 — Remover queries duplicadas no `PublicHome.tsx`
O hook `usePublicHomeData` já retorna `featured`, `exclusive`, `latest`, `types`, `cities`. Remover os imports/uses de:
- `useFeaturedProperties`
- `useExclusiveProperties`
- `usePropertyTypes`
- `usePublicCities`

Manter apenas `usePublicHomeData` e `usePublicNeighborhoods` (este último depende de `selectedCidade`).

### Passo 5 — Otimizar contagem de visitas no Dashboard (`src/pages/Dashboard.tsx`)
Trocar o `select('session_id')` por uma RPC `count_unique_sessions(org_id, from, to)` no Postgres que faz `SELECT COUNT(DISTINCT session_id)` server-side. Isso evita transferir milhares de linhas para o cliente.

> Requer criar uma função SQL via migration. Será criada em mode default após aprovação.

### Passo 6 — Validar
- Recarregar Dashboard e verificar tempo de render.
- Recarregar PublicHome (site público) e confirmar que aparece de imediato com skeletons progressivos.
- Confirmar que não há mais warnings de ref no console.

---

## Arquivos afetados
- `src/App.tsx` — QueryClient + PageLoader
- `src/components/ui/skeleton.tsx` — forwardRef
- `src/pages/public/PublicHome.tsx` — remover queries duplicadas
- `src/pages/Dashboard.tsx` — usar RPC para contagem
- Migration SQL — criar `count_unique_sessions`

## Resultado esperado
- Dashboard carrega em 1-2s ao invés de 5-10s.
- Sem tela branca durante navegação (spinner curto aparece e some).
- Console limpo, sem warnings em loop.
- Site público continua rápido com 1 query agregada ao invés de 6.
