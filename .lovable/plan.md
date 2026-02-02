

# Plano: Corrigir Filtro de Data na Pipeline e Dashboard

## Problema Identificado

O filtro de data personalizado **não aplica `startOfDay` e `endOfDay`** nas datas selecionadas pelo usuário. Quando você seleciona apenas o dia 01/02:

| O que deveria acontecer | O que está acontecendo |
|-------------------------|------------------------|
| `from: 2026-02-01 00:00:00` | `from: 2026-02-01 12:00:00` (hora do clique) |
| `to: 2026-02-01 23:59:59` | `to: 2026-02-01 12:00:00` (hora do clique) |

Isso faz com que:
- Leads criados entre 00:00 e 12:00 do dia 01 sejam **excluídos**
- Leads criados depois das 12:00 do dia 01 sejam **excluídos** (to deveria ser 23:59:59)

Quando você seleciona 01 e 02 juntos:
- O intervalo fica maior (01 12:00 até 02 12:00) e "por acaso" pega os leads

---

## Onde Está o Bug

### 1. `date-filter-popover.tsx` (linha 51-53)

O calendário retorna datas com a hora atual do navegador. Ao aplicar, não há conversão para início/fim do dia:

```typescript
// ATUAL (problemático)
onCustomDateRangeChange?.({
  from: tempDateRange.from,    // 2026-02-01T12:34:56
  to: tempDateRange.to,        // 2026-02-01T12:34:56
});
```

### 2. `Pipelines.tsx` (linha 398-401)

O componente usa o customDateRange diretamente, sem normalizar:

```typescript
// ATUAL (problemático)
const dateRange = useMemo(() => {
  if (customDateRange) return customDateRange; // Usa datas com hora errada
  return getDateRangeFromPreset(datePreset);
}, [datePreset, customDateRange]);
```

### 3. Dashboard hooks (linhas 134-135 e 441-442)

Usam `filters?.dateRange?.from/to?.toISOString()` diretamente:

```typescript
.gte('created_at', currentFrom.toISOString())  // Usa hora errada
.lte('created_at', currentTo.toISOString())    // Usa hora errada
```

---

## Solução

Aplicar `startOfDay` e `endOfDay` no momento correto - quando o usuário confirma a seleção personalizada.

### Arquivo 1: `src/components/ui/date-filter-popover.tsx`

Corrigir a função `handleApplyCustomDate`:

```typescript
import { startOfDay, endOfDay } from 'date-fns';

const handleApplyCustomDate = () => {
  if (tempDateRange.from && tempDateRange.to) {
    onDatePresetChange('custom');
    onCustomDateRangeChange?.({
      from: startOfDay(tempDateRange.from),  // 00:00:00
      to: endOfDay(tempDateRange.to),        // 23:59:59
    });
    setDatePickerOpen(false);
    setTempDateRange({});
  }
};
```

Esta é a correção mais limpa porque:
1. Resolve o problema na origem (onde a data é selecionada)
2. Todos os consumidores (Pipeline, Dashboard, etc.) recebem as datas já normalizadas
3. Não precisa alterar nenhum outro arquivo

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/components/ui/date-filter-popover.tsx` | Adicionar `startOfDay` e `endOfDay` no `handleApplyCustomDate` |

---

## Resultado Esperado

Após a correção:

- Selecionar **apenas dia 01** → mostra leads de `01/02 00:00:00` até `01/02 23:59:59`
- Selecionar **apenas dia 02** → mostra leads de `02/02 00:00:00` até `02/02 23:59:59`
- Selecionar **01 a 02** → mostra leads de `01/02 00:00:00` até `02/02 23:59:59`

Isso corrige tanto a Pipeline quanto o Dashboard, já que ambos usam o mesmo componente `DateFilterPopover`.

---

## Seção Técnica

### Por que isso acontece

O componente `react-day-picker` retorna objetos `Date` com a hora atual do navegador no momento do clique. Por exemplo, se você clica no dia 01 às 15:30, ele retorna `2026-02-01T15:30:00`.

A função `isWithinInterval` do `date-fns` faz uma comparação precisa de timestamps:

```typescript
// Lead criado às 10:00 do dia 01
leadDate = 2026-02-01T10:00:00

// Intervalo selecionado (clique às 15:30)
from = 2026-02-01T15:30:00
to = 2026-02-01T15:30:00

// isWithinInterval retorna FALSE
// porque 10:00 < 15:30 (leadDate está ANTES do intervalo)
```

### A correção

```typescript
from = startOfDay(2026-02-01) = 2026-02-01T00:00:00
to = endOfDay(2026-02-01) = 2026-02-01T23:59:59.999

// Agora isWithinInterval retorna TRUE
// porque 10:00 está entre 00:00 e 23:59
```

