
# Plano Final - Auditoria Completa do Sistema Financeiro

## Resumo da Auditoria

Após análise detalhada, identifiquei os seguintes pontos que precisam de ajustes para finalizar o módulo financeiro:

---

## Estado Atual do Sistema

### O que está funcionando
- Formulário de lançamentos financeiros (`FinancialEntryForm`) - código correto
- Formulário de contratos (`ContractForm`) - código correto
- Edge Function `recurring-entries-generator` - funcionando (processou 2 entradas, pulou porque hoje não é o dia de vencimento)
- Cron job configurado para executar às 06:00 UTC diariamente
- Campo `default_commission_percentage` nas organizações - configurado em 5%
- Hook `useActivateContract` - gera receivables e commissions ao ativar contrato
- Hook `useDealStatusChange` - gera comissão e receivable ao marcar lead como "won"

### Problemas Identificados

| Problema | Causa | Impacto |
|----------|-------|---------|
| **Comissões não aparecem** | Tabela `commissions` está vazia | Relatórios zerados |
| **Receivables não existem** | Nenhum entry do tipo `receivable` foi criado | Dashboard mostra R$ 0 |
| **4 leads "won" sem comissões** | Foram marcados como ganhos ANTES das correções serem implementadas | Dados históricos perdidos |
| **Dashboard mostra zeros** | Sem dados de commissions nem receivables para exibir | KPIs incorretos |

---

## Plano de Correção Final

### Etapa 1: Sincronizar Leads Históricos
Executar SQL para criar comissões e receivables para os 4 leads que foram marcados como "won" antes das correções:

```sql
-- Para cada lead won sem comissão vinculada
INSERT INTO commissions (organization_id, lead_id, user_id, base_value, amount, percentage, status, notes)
SELECT 
  l.organization_id,
  l.id as lead_id,
  l.assigned_user_id as user_id,
  l.valor_interesse as base_value,
  l.valor_interesse * (COALESCE(l.commission_percentage, o.default_commission_percentage, 5) / 100) as amount,
  COALESCE(l.commission_percentage, o.default_commission_percentage, 5) as percentage,
  'forecast' as status,
  'Comissão gerada retroativamente' as notes
FROM leads l
JOIN organizations o ON l.organization_id = o.id
WHERE l.deal_status = 'won'
  AND l.valor_interesse > 0
  AND NOT EXISTS (SELECT 1 FROM commissions c WHERE c.lead_id = l.id);

-- Criar receivables para leads won sem entry vinculado
INSERT INTO financial_entries (organization_id, lead_id, type, description, amount, due_date, status, created_at)
SELECT 
  l.organization_id,
  l.id as lead_id,
  'receivable' as type,
  'Venda - ' || l.name as description,
  l.valor_interesse as amount,
  (l.won_at + interval '30 days')::date as due_date,
  'pending' as status,
  now() as created_at
FROM leads l
WHERE l.deal_status = 'won'
  AND l.valor_interesse > 0
  AND NOT EXISTS (SELECT 1 FROM financial_entries fe WHERE fe.lead_id = l.id AND fe.type = 'receivable');
```

### Etapa 2: Correção no Mapeamento de Campos
O hook `useCommissions` usa `calculated_value`, mas a tabela tem `amount` como campo principal. Ajustar:

**Arquivo:** `src/hooks/use-commissions.ts`
- Linha 177: Já tem fallback `(commission as any).amount ?? commission.calculated_value` ✓
- Confirmar que está funcionando corretamente

### Etapa 3: Testar Fluxo Completo
1. Criar novo lead com `valor_interesse`
2. Marcar como "won"
3. Verificar se comissão foi criada
4. Verificar se receivable foi criado
5. Verificar se dashboard atualiza

### Etapa 4: Validar Recorrência
1. Criar lançamento com `is_recurring = true`
2. Aguardar execução do cron (ou testar manualmente)
3. Verificar se nova entrada foi gerada

### Etapa 5: Criar Receivables para Entradas Recorrentes que Estão Faltando
As 2 entradas recorrentes (Marketing Vila do Sol R$150 e Aluguel Loja R$2000) ainda não geraram filhos porque:
- Marketing: vencimento dia 20, hoje é dia 5
- Aluguel: vencimento dia 21, hoje é dia 5

Isso está **correto** - elas serão geradas nos dias certos.

---

## Arquivos que Precisam de Ajustes Menores

### 1. `src/hooks/use-create-commission.ts`
- Verificar se a validação de `userId` está muito restritiva
- Atualmente retorna `null` se não tiver usuário atribuído
- **Sugestão:** Permitir criar comissão sem usuário (pode ser atribuída depois)

### 2. `src/pages/FinancialDashboard.tsx`  
- Adicionar indicadores de "Leads Ganhos sem Receivable"
- Mostrar alerta quando há inconsistência de dados

### 3. `src/hooks/use-financial.ts`
- O `useFinancialDashboard` está correto, mas depende de ter dados
- Após rodar a migração de dados históricos, os valores aparecerão

---

## Checklist Final

- [ ] Executar SQL de sincronização de dados históricos
- [ ] Testar criação de novo lead → marcar como won → verificar comissão
- [ ] Testar criação de novo contrato → ativar → verificar receivables
- [ ] Testar formulário de lançamentos → criar, editar, marcar como pago
- [ ] Verificar se dashboard mostra valores corretos
- [ ] Testar exportação de relatórios

---

## Detalhes Técnicos

### Tabelas do Sistema Financeiro
```
financial_entries (amount, type: 'payable'|'receivable', status, is_recurring, parent_entry_id)
commissions (amount, percentage, base_value, status: 'forecast'|'approved'|'paid')
contracts (value, installments, down_payment, status)
contract_brokers (commission_percentage, commission_value)
organizations.default_commission_percentage
```

### Rotas do Módulo Financeiro
```
/financeiro            → FinancialDashboard
/financeiro/contas     → FinancialEntries (lançamentos)
/financeiro/contratos  → Contracts
/financeiro/comissoes  → Commissions
/financeiro/relatorios → FinancialReports
```

### Edge Functions
```
recurring-entries-generator → Cron 06:00 UTC diário ✓
notification-scheduler     → Alertas de vencimento ✓
```

---

## Próximos Passos Recomendados

1. **Executar migração de dados históricos** (SQL acima)
2. **Testar fluxo completo** no preview
3. **Verificar dashboard** após migração
4. **Marcar etapa 20 como completa** - Testes e validação final

O sistema financeiro está tecnicamente correto - o problema principal é que os leads foram marcados como "won" antes das integrações serem implementadas. Após executar a migração de sincronização, tudo deve funcionar normalmente.
