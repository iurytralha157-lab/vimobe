

# Plano: Integração Completa de Comissões no Sistema

## Diagnóstico da Situação Atual

Após análise detalhada, identifiquei que o sistema JÁ POSSUI uma boa integração, mas existem algumas lacunas e melhorias possíveis:

### O que JÁ FUNCIONA

| Funcionalidade | Status | Local |
|----------------|--------|-------|
| Comissão automática ao marcar "Ganho" | ✅ | `LeadDetailDialog.tsx` (linha 538-547) |
| VGV no Dashboard | ✅ | Usa `valor_interesse` de leads com `deal_status = 'won'` |
| Performance de Corretores | ✅ | Busca comissões da tabela `commissions` |
| Dashboard Financeiro | ✅ | Mostra comissões pendentes/aprovadas/pagas |
| Ranking Top 5 Corretores | ✅ | Ordena por `valor_interesse` de leads ganhos |

### O que PRECISA MELHORAR

1. **KPIs do Dashboard não mostram comissões pendentes** - O KPICards mostra VGV mas não mostra comissões do corretor logado

2. **TopBrokersWidget mostra apenas vendas, não comissões** - Seria interessante mostrar as comissões acumuladas por corretor

3. **Quando o valor/comissão muda no lead, a comissão já existente não é atualizada** - Se o usuário alterar o valor de interesse ou a comissão depois de marcar como "ganho", o registro na tabela de comissões não é atualizado

4. **Falta feedback visual ao criar comissão** - Quando marca como "Ganho", poderia mostrar o valor da comissão criada

---

## Solução Proposta

### Parte 1: Mostrar Comissões no Dashboard Principal

Adicionar card de "Minhas Comissões" no Dashboard para corretores verem suas comissões pendentes.

**Mudança no KPICards.tsx:**
- Adicionar um card que mostra as comissões pendentes do corretor logado
- Para admins, mostra o total de comissões pendentes

**Mudança no use-dashboard-stats.ts:**
- Já busca `pendingCommissions`, então os dados já estão disponíveis

### Parte 2: Incluir Comissões no TopBrokersWidget

Modificar para mostrar a comissão acumulada de cada corretor, não apenas vendas.

**Mudança no use-dashboard-stats.ts (useTopBrokers):**
```typescript
// Adicionar busca de comissões por corretor
const { data: commissions } = await supabase
  .from('commissions')
  .select('user_id, amount')
  .in('user_id', userIds);

// Agregar comissões por broker
acc[userId].commissions += commission.amount;
```

**Mudança no TopBrokersWidget.tsx:**
- Adicionar linha mostrando comissão abaixo do valor de vendas

### Parte 3: Atualizar Comissão Quando Lead Mudar

Quando o `valor_interesse` ou `commission_percentage` do lead for alterado (e o lead já tiver uma comissão criada), atualizar o registro existente.

**Novo hook: `useUpdateLeadCommission`**

```typescript
// Se existe comissão para este lead, recalcular
if (existingCommission && (lead.valor_interesse || lead.commission_percentage changed)) {
  const newAmount = valorInteresse * (commissionPercentage / 100);
  await supabase
    .from('commissions')
    .update({ amount: newAmount, base_value: valorInteresse })
    .eq('lead_id', leadId);
}
```

**Integração no LeadDetailDialog:**
- Chamar update de comissão ao salvar valor de interesse ou comissão

### Parte 4: Feedback Visual ao Criar Comissão

Melhorar o toast quando a comissão é criada automaticamente.

**Mudança no use-create-commission.ts:**
```typescript
toast.success(
  `Comissão de R$ ${commissionAmount.toLocaleString('pt-BR')} gerada!`,
  { description: `${commissionPercentage}% de R$ ${valorInteresse.toLocaleString('pt-BR')}` }
);
```

### Parte 5: Garantir Consistência de Dados

Adicionar trigger no banco para garantir que leads "ganhos" sempre tenham comissão (se tiver valor e percentual configurados).

**Migration SQL:**
```sql
-- Trigger que cria comissão automaticamente quando lead é marcado como won
-- (backup para garantir que a lógica do frontend não falhe)
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/KPICards.tsx` | Adicionar card de "Minhas Comissões" |
| `src/hooks/use-dashboard-stats.ts` | Buscar comissões por broker no TopBrokers |
| `src/components/dashboard/TopBrokersWidget.tsx` | Mostrar comissões por corretor |
| `src/hooks/use-create-commission.ts` | Melhorar toast com valor detalhado |
| `src/components/leads/LeadDetailDialog.tsx` | Atualizar comissão existente ao mudar valores |
| **Migration SQL** (opcional) | Trigger de backup para criar comissão |

---

## Fluxo Esperado Após Implementação

### Cenário: Corretor marca lead como "Ganho"

```
1. Corretor define Valor de Interesse: R$ 500.000
2. Corretor define Comissão: 5%
3. Corretor marca status: "Ganho"
4. Sistema cria comissão automaticamente
5. Toast: "Comissão de R$ 25.000 gerada! (5% de R$ 500.000)"
6. Comissão aparece em:
   - Dashboard > Card "Minhas Comissões": R$ 25.000 pendente
   - Performance de Corretores > Coluna "Comissões"
   - Financeiro > Comissões > Aba "Previsão"
   - Top 5 Corretores (se aplicável)
```

### Cenário: Corretor altera valor após ganho

```
1. Lead já está como "Ganho" com comissão de R$ 25.000
2. Corretor altera Valor de Interesse para R$ 600.000
3. Sistema recalcula: R$ 600.000 x 5% = R$ 30.000
4. Comissão atualizada automaticamente
5. Toast: "Comissão atualizada para R$ 30.000"
```

---

## Resumo das Melhorias

- **Dashboard**: Card mostrando comissões pendentes do corretor
- **Ranking**: Mostrar comissões acumuladas por corretor
- **Atualização**: Recalcular comissão quando valor/percentual mudar
- **Feedback**: Toast detalhado com valores ao criar/atualizar comissão
- **Consistência**: Dados sempre sincronizados entre leads e comissões

