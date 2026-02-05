
# Plano de Correção: Dashboard Financeiro e Relatórios

## Problemas Identificados

Após análise completa do código e dados, encontrei **5 problemas principais**:

### 1. A Receber 30/60/90 dias mostrando valores iguais

**Causa**: A lógica atual usa filtros cumulativos. Se um lançamento vence em 35 dias, ele aparece em 30d, 60d E 90d porque:
- 30d = vencimentos até hoje + 30 dias 
- 60d = vencimentos até hoje + 60 dias (inclui os de 30d)
- 90d = vencimentos até hoje + 90 dias (inclui os de 30d e 60d)

No caso do seu lançamento de R$ 250.000 vencendo em 07/03 (~30 dias), ele aparece nos três porque todos os filtros o incluem.

**Correção**: Mostrar valores por faixa (0-30d, 31-60d, 61-90d) ou manter cumulativo mas deixar claro na interface.

### 2. Marcar como pago não reflete no Dashboard

**Causa**: Quando você marca uma conta como "paga" em Contas:
- O status muda para `paid`
- Mas o dashboard filtra `status = 'pending'` para calcular "A Pagar"
- O fluxo de caixa deveria mostrar, mas usa `paid_date` e precisa que o mês/ano corresponda

Verifiquei no banco: o lançamento "Teste" de R$ 25.000 foi marcado como pago em `2026-02-05`. Porém:
- **A Pagar** busca apenas `status = 'pending'` - funcionando corretamente
- **Fluxo de Caixa** busca os últimos 6 meses por `paid_date` - fevereiro é o mês atual

**Problema real**: O gráfico mostra fevereiro/26, mas pode não estar atualizando. Preciso verificar se o `paid_date` está sendo setado corretamente e se as queries estão sendo invalidadas.

### 3. Relatórios não exibindo dados corretamente

**Causas identificadas**:
- **Pagamentos Realizados**: Filtra por `status = 'paid'` E pelo período selecionado (mês atual por padrão). Se os pagamentos foram em meses anteriores, não aparecem.
- **Pendências Financeiras**: Busca `status = 'overdue'` OU `pending` com `due_date < hoje`. Porém R$ 25.000 agora está como `paid`, então não deveria aparecer. **Se ainda aparece, o status não foi atualizado corretamente no banco.**
- **Receita por Imóvel**: Não está implementado (sempre mostra vazio).

### 4. Card "A Receber (90d)" está na segunda linha

**Problema de UX**: O 90d está isolado na segunda linha enquanto 30d e 60d estão na primeira.

---

## Correções Propostas

### Arquivos a modificar:

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-financial.ts` | Corrigir cálculo de 30/60/90 dias para mostrar faixas, não cumulativo |
| `src/pages/FinancialDashboard.tsx` | Reorganizar cards para agrupar A Receber 30/60/90 dias juntos |
| `src/pages/FinancialReports.tsx` | Ajustar filtro de período para "Pagamentos Realizados" incluir todos os pagos |
| `src/hooks/use-financial.ts` | Garantir que `useMarkEntryAsPaid` invalida todas as queries corretamente |

---

## Detalhes Técnicos

### 1. Corrigir cálculo A Receber por faixas

```typescript
// Em use-financial.ts - useFinancialDashboard
// ANTES (cumulativo)
const entriesReceivable30 = receivables.filter(r => 
  new Date(r.due_date) <= days30
).reduce(...);

// DEPOIS (por faixas)
const entriesReceivable30 = receivables.filter(r => {
  const dueDate = new Date(r.due_date);
  return dueDate >= today && dueDate <= days30;
}).reduce(...);

const entriesReceivable60 = receivables.filter(r => {
  const dueDate = new Date(r.due_date);
  return dueDate > days30 && dueDate <= days60;
}).reduce(...);

const entriesReceivable90 = receivables.filter(r => {
  const dueDate = new Date(r.due_date);
  return dueDate > days60 && dueDate <= days90;
}).reduce(...);
```

### 2. Reorganizar Dashboard - KPIs agrupados

```text
Linha 1: [A Receber 30d] [A Receber 60d] [A Receber 90d] [A Pagar Total]
Linha 2: [Comissões Prev] [Comissões Pend] [Comissões Pagas] [Vencidos]
```

### 3. Relatórios - Pagamentos sem filtro de período

Para "Pagamentos Realizados", remover o filtro de período ou usar `paid_date` em vez de `due_date`:

```typescript
// Para relatório de pagamentos, usar paid_date para filtrar
const paidInPeriod = entries?.filter(e => {
  if (e.status !== 'paid' || !e.paid_date) return false;
  const paidDate = new Date(e.paid_date);
  return paidDate >= start && paidDate <= end;
}) || [];
```

### 4. Verificar invalidação de cache

O hook `useMarkEntryAsPaid` já invalida:
- `financial-entries`
- `financial-dashboard`

Adicionar também invalidação de queries de relatórios se necessário.

---

## Resultado Esperado

Após as correções:

| Antes | Depois |
|-------|--------|
| 30/60/90d mostram R$ 250k iguais | 30d: R$ 250k, 60d: R$ 0, 90d: R$ 0 (se vence em ~30 dias) |
| Conta paga ainda aparece em "A Pagar" | Conta some de "A Pagar" e aparece no Fluxo de Caixa |
| Pagamentos Realizados vazio | Mostra o pagamento de R$ 25k de hoje |
| Pendências mostra R$ 25k errado | Remove itens já pagos |
| Cards desorganizados | 30/60/90d na mesma linha, layout consistente |
