
## Correções Finais na Página de Performance

### O que está funcionando corretamente

O fluxo do filtro de período está tecnicamente correto:

- O estado `datePreset` e `customDateRange` são gerenciados no componente
- O `dateRange` é calculado via `useMemo` e reage imediatamente a mudanças
- Os dois hooks (`useMyPerformance` e `useTeamRanking`) recebem o `dateRange` e incluem no `queryKey` — o React Query refaz as queries automaticamente
- A consolidação das 6 queries do gráfico em 1 única query está correta
- A invalidação de cache do `useUpsertMyGoal` foi corrigida

### Problemas restantes identificados na revisão

**1. Subtítulo do Ranking sempre mostra o mês atual**

Linha 387 de `BrokerPerformance.tsx`:

```tsx
// ATUAL — sempre exibe "fevereiro de 2026" independente do filtro
{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
```

Quando o usuário seleciona "Este ano" ou "Últimos 30 dias", o subtítulo continua dizendo "fevereiro de 2026" — contradizendo o filtro ativo visualmente e confundindo o usuário.

**2. Mensagem de lista vazia do Ranking hardcoded**

Linha 401:
```tsx
"Nenhum dado encontrado para o mês atual"
```
Se o filtro for "Hoje" ou "Esta semana", a mensagem fica inconsistente.

**3. Import não utilizado — `parseISO`**

Em `use-my-performance.ts` linha 4, `parseISO` está importado mas nunca usado após a refatoração.

### Correções a aplicar

**Arquivo: `src/pages/BrokerPerformance.tsx`**

Substituir o subtítulo fixo do Ranking por um label dinâmico baseado no `datePreset`:

```tsx
// Label do período selecionado
const periodLabel = useMemo(() => {
  if (datePreset === 'custom' && customDateRange) {
    return `${format(customDateRange.from, 'dd/MM', { locale: ptBR })} – ${format(customDateRange.to, 'dd/MM', { locale: ptBR })}`;
  }
  const option = datePresetOptions.find(o => o.value === datePreset);
  return option?.label || 'Período';
}, [datePreset, customDateRange]);
```

E usar `periodLabel` no subtítulo e na mensagem de empty state do ranking.

**Arquivo: `src/hooks/use-my-performance.ts`**

Remover `parseISO` do import (não utilizado).

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/BrokerPerformance.tsx` | Subtítulo e empty state do Ranking dinâmicos conforme o filtro |
| `src/hooks/use-my-performance.ts` | Remover import `parseISO` não utilizado |
