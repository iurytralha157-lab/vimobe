
# Auditoria Completa do Sistema Financeiro - Plano de Correção em 20 Etapas

## Resumo Executivo

Após análise detalhada do sistema financeiro, identifiquei **problemas críticos** que precisam ser corrigidos para que todos os dados financeiros fluam corretamente e sejam exibidos nos dashboards e relatórios.

---

## Problemas Identificados

### PROBLEMA 1: Comissões Não Estão Sendo Criadas
- Ao marcar um lead como "Ganho", a comissão só é criada se existir `valor_interesse` e `commission_percentage` preenchidos no lead
- Na prática, a maioria dos leads ganhos **não tem esses campos preenchidos**, resultando em zero comissões no sistema
- **Evidência**: A tabela `commissions` está vazia enquanto há 4 leads marcados como "won"

### PROBLEMA 2: Lançamentos Recorrentes Não Funcionam
- A Edge Function `recurring-entries-generator` **nunca foi executada** (zero logs)
- Não há um cron job configurado para executá-la diariamente
- Lançamentos marcados como recorrentes não geram novas entradas automaticamente
- **Evidência**: Há lançamentos com `is_recurring=true` mas sem `parent_entry_id` gerados

### PROBLEMA 3: Contas a Receber Baseadas em Valor de Venda
- Quando um imóvel é vendido, deveria gerar automaticamente uma entrada "A Receber" no financeiro
- Atualmente isso **não acontece** - a venda do imóvel não reflete no financeiro

### PROBLEMA 4: Contratos Não Alimentam o Financeiro
- Ao ativar um contrato, apenas comissões são geradas (para corretores)
- Não são geradas entradas "A Receber" baseadas no valor do contrato

### PROBLEMA 5: Dashboard Financeiro Mostra Zeros
- O dashboard calcula "A Receber 30/60/90d" apenas com `financial_entries` manuais
- Não considera vendas de leads (`valor_interesse` de leads "won")
- Não considera contratos ativos

### PROBLEMA 6: Comissões Não Aparecem no Ranking
- O hook `useBrokerPerformance` busca comissões corretamente
- Mas como a tabela `commissions` está vazia, os valores são sempre zero

### PROBLEMA 7: Relatórios Financeiros Incompletos
- O relatório "Comissões por Corretor" não mostra nada (sem dados)
- O fechamento mensal considera apenas lançamentos manuais

---

## Plano de Correção - 20 Etapas

### FASE 1: Correções Críticas (Etapas 1-5)

**Etapa 1: Criar Comissões Automaticamente ao Ganhar Lead**
- Modificar `useCreateCommissionOnWon` para criar comissão mesmo sem `commission_percentage` 
- Usar percentual padrão da propriedade ou da organização como fallback
- Criar campo `default_commission_percentage` na tabela `organizations`

**Etapa 2: Gerar Conta a Receber ao Ganhar Lead**
- Quando lead é marcado como "won" com `valor_interesse > 0`:
  - Criar automaticamente um `financial_entry` do tipo "receivable"
  - Vincular ao `lead_id` para rastreabilidade
  - Definir vencimento padrão (30 dias)

**Etapa 3: Configurar Cron Job para Recorrentes**
- Configurar o Supabase Cron para executar `recurring-entries-generator` diariamente às 06:00 UTC
- Adicionar logs detalhados na Edge Function
- Testar a geração de lançamentos recorrentes

**Etapa 4: Corrigir Lógica de Recorrência**
- Ajustar a Edge Function para criar lançamentos filhos corretamente
- Evitar duplicatas verificando `parent_entry_id + due_date`
- Notificar admins quando lançamentos são gerados

**Etapa 5: Sincronizar Comissões Históricas**
- Criar script de migração que:
  - Busca todos os leads "won" com `valor_interesse > 0`
  - Cria registros de comissão para os que não têm
  - Usa `commission_percentage` do lead ou propriedade

---

### FASE 2: Integração Contratos-Financeiro (Etapas 6-9)

**Etapa 6: Gerar Entradas ao Ativar Contrato**
- Ao ativar contrato, criar `financial_entry`:
  - Tipo: "receivable"
  - Valor: valor do contrato
  - Parcelas: conforme configurado no contrato
  - Vincular ao `contract_id`

**Etapa 7: Sincronizar Status Contrato-Financeiro**
- Quando pagamento é marcado como "pago", atualizar contrato
- Quando contrato é cancelado, cancelar lançamentos pendentes

**Etapa 8: Exibir Contratos no Dashboard Financeiro**
- Adicionar card "Contratos Ativos" no dashboard
- Mostrar valor total de contratos vs recebido

**Etapa 9: Relatório de Contratos por Período**
- Criar relatório de contratos assinados por mês
- Incluir breakdown por corretor e tipo de contrato

---

### FASE 3: Dashboard e KPIs (Etapas 10-13)

**Etapa 10: Refatorar useFinancialDashboard**
- Incluir no cálculo de "A Receber":
  - `financial_entries` pendentes
  - Leads "won" com valor (se não tiver entry vinculado)
  - Contratos ativos com parcelas pendentes

**Etapa 11: Incluir Comissões no Dashboard**
- Mostrar comissões por status (Forecast, Aprovadas, Pagas)
- Adicionar gráfico de evolução de comissões

**Etapa 12: Melhorar Fluxo de Caixa**
- O gráfico atual só mostra `paid_date`
- Incluir projeção baseada em vencimentos futuros
- Mostrar linha de tendência

**Etapa 13: KPIs Financeiros no Dashboard Principal**
- Adicionar mini-cards financeiros no Dashboard principal
- Mostrar resumo de vendas vs comissões vs recebíveis

---

### FASE 4: Relatórios e Exportação (Etapas 14-16)

**Etapa 14: Relatório de Comissões Completo**
- Corrigir exibição de comissões por corretor
- Incluir totais e médias
- Permitir filtro por período e status

**Etapa 15: Relatório de Vendas por Imóvel**
- Listar todos os imóveis vendidos com valores
- Incluir comissão gerada e status de pagamento

**Etapa 16: DRE Simplificado**
- Receitas (vendas + aluguéis)
- Despesas (operacionais)
- Comissões pagas
- Resultado do período

---

### FASE 5: Automação e Alertas (Etapas 17-20)

**Etapa 17: Alertas de Vencimento**
- Notificação quando lançamento está para vencer (3 dias antes)
- Notificação de comissão pendente de aprovação
- Integrar com sistema de notificações push

**Etapa 18: Campo de Comissão Padrão**
- Adicionar `default_commission_percentage` em `organizations`
- Usar como fallback quando lead/imóvel não tem comissão definida

**Etapa 19: Validações no Formulário**
- Alertar quando lead é marcado "won" sem `valor_interesse`
- Sugerir preenchimento de comissão antes de ganhar
- Mostrar preview do valor da comissão

**Etapa 20: Testes e Validação Final**
- Testar fluxo completo: Lead -> Ganho -> Comissão -> Financeiro
- Verificar relatórios refletem dados corretos
- Validar lançamentos recorrentes funcionando

---

## Detalhes Técnicos

### Tabelas Envolvidas
```text
leads (valor_interesse, commission_percentage, deal_status, won_at)
commissions (amount, base_value, status, lead_id, user_id)
financial_entries (amount, type, status, due_date, is_recurring, parent_entry_id)
contracts (value, status, commission_percentage)
contract_brokers (commission_percentage, commission_value)
organizations (default_commission_percentage - A CRIAR)
```

### Edge Functions
```text
recurring-entries-generator - Precisa de cron job
```

### Hooks a Modificar
```text
use-create-commission.ts - Fallbacks de comissão
use-financial.ts - Gerar entrada ao ganhar lead
use-leads.ts - Integrar com financeiro ao mudar deal_status
use-dashboard-stats.ts - Incluir dados de vendas
```

### Componentes a Atualizar
```text
LeadDetailDialog.tsx - Validações ao marcar "won"
FinancialDashboard.tsx - Novos KPIs
FinancialReports.tsx - Relatórios melhorados
```

---

## Ordem de Prioridade

| Prioridade | Etapas | Impacto |
|------------|--------|---------|
| CRÍTICA | 1, 2, 3, 5 | Comissões e recorrentes |
| ALTA | 4, 10, 11, 14 | Dashboard e relatórios |
| MÉDIA | 6, 7, 8, 9 | Contratos |
| NORMAL | 12, 13, 15, 16, 17 | Melhorias |
| BAIXA | 18, 19, 20 | Refinamentos |

---

## Próximos Passos

Podemos começar pela **Etapa 1** (Criar comissões automaticamente) que resolverá o problema mais crítico de comissões não aparecendo no sistema. 

Após aprovar este plano, implementaremos cada etapa sequencialmente ou em grupos, validando a cada fase.
