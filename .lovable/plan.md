
## Diagnóstico: Por que o gráfico está vazio

### Causa raiz identificada

Consultando o banco de dados, existem 5 leads com `deal_status = 'won'` e todos têm `won_at` preenchido. Os `assigned_user_id` desses leads são:
- `9853f99b` — 1 lead (fev/2026)
- `3b27bc23` — 2 leads (jan e fev/2026)
- `b72ba88d` — 1 lead (fev/2026)
- `3df10ff2` — 1 lead (fev/2026)

O hook `useMyPerformance` filtra **estritamente por `assigned_user_id = userId` (usuário logado)**. Se o usuário logado não for nenhum desses 4 IDs, o gráfico retorna zero dados.

Mas além desse problema de dados, há **dois bugs técnicos reais** que precisam ser corrigidos:

---

### Bug 1 — Invalidação de cache quebrada após salvar meta

Em `use-my-performance.ts` linha 188, o `onSuccess` do `useUpsertMyGoal` invalida:
```ts
queryKey: ["my-performance", user?.id]
```

Mas o `queryKey` real da query tem **4 elementos**: `["my-performance", userId, dateRange.from.toISOString(), dateRange.to.toISOString()]`

A invalidação com apenas 2 elementos **nunca bate**, então a query não é re-executada após salvar a meta. Isso é um bug real.

**Correção**: usar `{ queryKey: ["my-performance"] }` com apenas o prefixo, que invalida qualquer query cujo key começa com "my-performance".

---

### Bug 2 — Gráfico de 6 meses sempre vazio quando `dateRange` muda

O gráfico usa `perf?.last6Months`. Esses dados vêm do mesmo `queryFn` do hook — que faz **6 queries individuais adicionais** em loop para buscar cada mês.

O problema: o `queryKey` inclui o `dateRange`, então quando o filtro muda, o React Query **cria um novo cache entry** em vez de reusar o anterior. Na primeira vez que a página carrega com um `dateRange` específico, todos os dados são buscados corretamente — mas se a query falhar silenciosamente (ex: timeout, erro de RLS), o gráfico fica vazio sem nenhum feedback visual.

Além disso, o loop `for (let i = 5; i >= 0; i--)` faz **6 queries sequenciais** (await dentro de for), tornando o carregamento lento e propenso a falhas parciais.

**Correção**: Consolidar as 6 queries individuais em **uma única query** com filtro de data cobrindo os últimos 6 meses, agrupando os resultados em JavaScript. Isso é mais rápido e confiável.

---

### Bug 3 — Texto fixo "no mês atual" nos KPI cards

Nos cards de KPI (linha 217 e 235 de BrokerPerformance.tsx), o subtexto está hardcoded como "no mês atual" independente do filtro selecionado. Se o usuário seleciona "Últimos 30 dias" ou "Este ano", o texto continua errado.

**Correção**: Usar o label do preset selecionado no subtexto dos cards.

---

### Mudanças planejadas

**Arquivo: `src/hooks/use-my-performance.ts`**

1. **Consolidar as 6 queries do gráfico em 1 única query**: ao invés de fazer um `await supabase` dentro de um loop de 6 iterações, fazer uma única query com `.gte("won_at", sixMonthsAgo).lte("won_at", now)` e agrupar os resultados por mês em JavaScript. Isso elimina 5 roundtrips ao banco.

2. **Corrigir a invalidação de cache**: mudar `queryKey: ["my-performance", user?.id]` para `queryKey: ["my-performance"]` no `onSuccess` do `useUpsertMyGoal`.

**Arquivo: `src/pages/BrokerPerformance.tsx`**

3. **Corrigir subtexto dos KPI cards**: substituir "no mês atual" e "vendas no mês" por um label dinâmico baseado no `datePreset` selecionado (ex: "no período selecionado").

---

### Comportamento após a correção

| Situação | Antes | Depois |
|---|---|---|
| Salvar meta | Cache não atualiza, dados velhos permanecem | Cache invalidado corretamente, progresso atualiza |
| Carregar gráfico | 6 queries sequenciais, propensas a falha | 1 query consolidada, mais rápida e confiável |
| Subtexto KPI | Sempre "no mês atual" | Reflete o período selecionado |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/hooks/use-my-performance.ts` | Consolidar 6 queries do gráfico em 1; corrigir invalidação de cache |
| `src/pages/BrokerPerformance.tsx` | Subtexto dinâmico nos KPI cards |
