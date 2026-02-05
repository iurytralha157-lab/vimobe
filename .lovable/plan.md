
# Plano de Melhoria: Relatórios Financeiros

## Diagnóstico

O relatório "Fechamento Mensal" mostra R$ 0,00 porque **não há lançamentos com vencimento em fevereiro/2026**:

| Lançamentos Existentes | Vencimento |
|------------------------|------------|
| Venda - Lead Teste Financeiro (R$ 250k) | 07/03/2026 |
| Venda - Isabelle (R$ 195k) | 01/03/2026 |
| Venda - Marinoni (R$ 1.3M) | 06/03/2026 |
| Teste Marketing (R$ 25k - pago) | 08/01/2026 |

Nenhum lançamento tem `due_date` entre 01/02/2026 e 28/02/2026.

## Problema de UX

O relatório funciona corretamente, mas confunde o usuário porque:
1. Ele espera ver um resumo geral, não apenas do mês atual
2. Há lançamentos futuros (março) que não aparecem
3. Há lançamentos passados pagos (janeiro) que também não aparecem

## Solução Proposta

Melhorar os relatórios para serem mais úteis:

### Mudanças no Fechamento Mensal

1. **Adicionar visão "Geral"** que mostra todos os lançamentos pendentes (sem filtro de período)
2. **Melhorar a seleção de período** para incluir meses futuros
3. **Mostrar mensagem informativa** quando não há dados no período

### Arquivo a Alterar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/FinancialReports.tsx` | Adicionar opção "Todos" no filtro de período; melhorar feedback quando vazio |

### Detalhes Técnicos

```typescript
// Adicionar opção "Todos" no período
const periodOptions = [
  { value: 'all', label: 'Todos' },        // NOVO
  { value: 'current', label: 'Mês Atual' },
  { value: 'next', label: 'Próximo Mês' }, // NOVO
  { value: 'last', label: 'Mês Anterior' },
  { value: 'quarter', label: 'Últimos 3 meses' },
];

// Ajustar getPeriodDates
case 'all':
  return { start: null, end: null }; // Sem filtro
case 'next':
  return { start: startOfMonth(addMonths(now, 1)), end: endOfMonth(addMonths(now, 1)) };

// Ajustar filteredEntries
const filteredEntries = entries?.filter(e => {
  if (!start || !end) return true; // Sem filtro quando "Todos"
  const date = new Date(e.due_date);
  return date >= start && date <= end;
}) || [];
```

### Adicionar feedback visual

Quando não houver dados no período selecionado, mostrar:
- Quantos lançamentos existem em outros períodos
- Sugestão para mudar o filtro

## Resultado Esperado

| Período | Antes | Depois |
|---------|-------|--------|
| Mês Atual (fev) | R$ 0,00 | R$ 0,00 + mensagem "Há X lançamentos em outros meses" |
| Próximo Mês (mar) | - | R$ 3M+ (os lançamentos de março) |
| Todos | - | Todos os lançamentos pendentes |
