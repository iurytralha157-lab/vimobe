
## Adicionar Filtro de Período na Página de Performance

### Diagnóstico

A página `BrokerPerformance.tsx` usa dois hooks fixos no mês atual:

- `useMyPerformance()` — hardcoded com `startOfMonth(now)` / `endOfMonth(now)`
- `useTeamRanking()` — hardcoded com `startOfMonth(now)` / `endOfMonth(now)`

O componente `DateFilterPopover` já existe em `src/components/ui/date-filter-popover.tsx` e é exatamente igual ao da imagem enviada (presets + calendário customizado + botão Aplicar). Só precisamos conectá-lo à página e aos hooks.

### Mudanças necessárias

**1. `src/hooks/use-my-performance.ts`**

Adicionar parâmetro `dateRange: { from: Date; to: Date }` na função `useMyPerformance`:

- O `queryKey` passa a incluir `dateRange` para reagir a mudanças de filtro
- As queries de `leads` usam `gte("won_at", from)` / `lte("won_at", to)` do `dateRange` recebido
- O gráfico de 6 meses permanece fixo (sempre mostra os últimos 6 meses como histórico independente do filtro)
- O `goalProgress` e `currentGoal` continuam baseados no mês atual (a meta é sempre mensal)

**2. `src/hooks/use-team-ranking.ts`**

Adicionar parâmetro `dateRange: { from: Date; to: Date }`:

- O `queryKey` inclui `dateRange`
- A query de `leads` usa o `dateRange` recebido

**3. `src/pages/BrokerPerformance.tsx`**

- Importar `useState` (já existe), `DateFilterPopover` e `getDateRangeFromPreset`/`DatePreset` do hook de filtros
- Criar estado local: `datePreset`, `customDateRange`
- Calcular `dateRange` a partir do preset ou do range customizado
- Passar `dateRange` para `useMyPerformance(dateRange)` e `useTeamRanking(dateRange)`
- Renderizar o `DateFilterPopover` no header de cada seção (ou um único filtro global no topo)
- O label do período muda de "MMMM de yyyy" para o label do preset selecionado

### Layout do filtro na UI

Um filtro único no topo da página (antes das duas colunas), alinhado à direita:

```text
┌──────────────────────────────────────────────────────────┐
│  [Minha Performance] [fevereiro de 2026]  [📅 Este mês ▼]│
└──────────────────────────────────────────────────────────┘
┌────────────────────────┐  ┌────────────────────────────┐
│  KPI Cards             │  │  Ranking da Equipe         │
│  Barra de meta         │  │  (mesma seleção de período) │
│  Gráfico 6 meses       │  │                            │
└────────────────────────┘  └────────────────────────────┘
```

O filtro ficará no header da página (dentro do `AppLayout`), exatamente igual ao da Dashboard — um botão compacto com o ícone de calendário que abre o popover com presets e calendário customizado.

### Default do filtro

O preset padrão será `thisMonth` (mês atual), que é o comportamento atual da página — sem quebrar a experiência existente.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/hooks/use-my-performance.ts` | Aceitar `dateRange` como parâmetro; usar nas queries de leads |
| `src/hooks/use-team-ranking.ts` | Aceitar `dateRange` como parâmetro; usar na query de leads |
| `src/pages/BrokerPerformance.tsx` | Estado do filtro, `DateFilterPopover` no topo, passar `dateRange` para os hooks |
