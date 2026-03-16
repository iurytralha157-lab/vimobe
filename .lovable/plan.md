# Melhorias Telecom - Solicitação do Cliente

## Contexto
Todas as mudanças são EXCLUSIVAMENTE para o segmento Telecom (`organization.segment === 'telecom'`). Nenhuma alteração deve afetar o fluxo imobiliário existente.

---

## 1. DASHBOARD - Ranking de Vendas dos Colaboradores

**Situação atual:** O widget `TopBrokersWidget` existe e é exibido apenas no dashboard imobiliário. O dashboard Telecom não possui ranking.

**O que fazer:**
- Criar um hook `useTelecomTopSellers` em `use-telecom-dashboard-stats.ts` que busca vendedores com mais vendas (leads `deal_status = 'won'`) no período filtrado
- Incluir dados de valor total vendido (soma de `valor_interesse` dos leads ganhos) e comissões
- Reutilizar o componente `TopBrokersWidget` no dashboard Telecom (já é genérico)
- Posicionar o ranking na seção inferior junto com origens

**Arquivos a alterar:**
- `src/hooks/use-telecom-dashboard-stats.ts` — adicionar hook de ranking telecom
- `src/pages/Dashboard.tsx` — incluir `TopBrokersWidget` na seção telecom

---

## 2. DASHBOARD - Alterar Receita Mensal para Ticket Médio

**Situação atual:** O 4º KPI no `TelecomKPICards` é "Receita Mensal" (MRR = soma dos plan_value de clientes INSTALADOS).

**O que fazer:**
- Substituir "Receita Mensal" por "Ticket Médio"
- Cálculo: MRR / número de clientes ativos (INSTALADOS). Se 0 ativos, ticket médio = 0.
- Manter o MRR disponível internamente para cálculos financeiros, apenas trocar o KPI exibido
- Atualizar o tooltip, label e ícone do card

**Arquivos a alterar:**
- `src/components/dashboard/TelecomKPICards.tsx` — trocar o 4º KPI de MRR para Ticket Médio
- `src/hooks/use-telecom-dashboard-stats.ts` — adicionar `averageTicket` ao retorno

---

## 3. DASHBOARD - Visibilidade de Comissões em Tempo Real para Vendedores

**Situação atual:** Vendedores não veem suas comissões no dashboard. As comissões só aparecem na página dedicada de Comissões.

**O que fazer:**
- Criar um widget compacto `TelecomSellerCommissions` que mostra:
  - Total de comissões acumuladas (forecast + approved) no período
  - Comissões já pagas
  - Lista das últimas 5 comissões com status (badge colorido)
- O widget respeita a visibilidade: vendedor vê SÓ as suas; admin vê de todos
- Posicionar no dashboard Telecom abaixo do ranking

**Arquivos a criar/alterar:**
- `src/components/dashboard/TelecomSellerCommissions.tsx` — novo widget
- `src/pages/Dashboard.tsx` — incluir widget na seção telecom

---

## 4. FINANCEIRO - Comissionamento por Plano de Serviço

**Situação atual:** A `commission_percentage` vem do lead (preenchida manualmente ou copiada do plano). A tabela `service_plans` pode ou não ter coluna `commission_percentage`.

**O que fazer:**
- Verificar/adicionar `commission_percentage numeric` na tabela `service_plans` via migration
- No formulário de cadastro de planos, adicionar campo "% Comissão" editável
- Garantir que o sync automático (quando vendedor seleciona plano no lead telecom) copie `commission_percentage` do plano para o lead
- Cada plano terá sua própria comissão, permitindo diferenciação por produto

**Arquivos a alterar:**
- Migration SQL: `ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS commission_percentage numeric;`
- `src/pages/ServicePlans.tsx` — adicionar campo de comissão no formulário
- `src/hooks/use-service-plans.ts` — incluir `commission_percentage` no tipo
- Verificar sync em `src/components/leads/TelecomCustomerTab.tsx`

---

## 5. FINANCEIRO - Exportar DRE

**Situação atual:** Os botões "Excel" e "PDF" na página DRE mostram toast "em desenvolvimento".

**O que fazer:**
- Implementar exportação Excel da DRE usando lib existente (`export-financial.ts`)
- Gerar .xlsx com linhas formatadas (conta, valor, AV%, anterior, variação)
- Implementar exportação PDF via `window.print()` com CSS de impressão
- A DRE já funciona para qualquer segmento, não precisa lógica telecom-específica

**Arquivos a alterar:**
- `src/pages/FinancialDRE.tsx` — implementar export handlers
- `src/lib/export-financial.ts` — adicionar `prepareDREExport`

---

## Ordem de Execução

1. Migration: `commission_percentage` em `service_plans`
2. Hook: telecom ranking + averageTicket em `use-telecom-dashboard-stats.ts`
3. TelecomKPICards: trocar MRR por Ticket Médio
4. Widget: `TelecomSellerCommissions`
5. Dashboard: integrar ranking + comissões na seção telecom
6. ServicePlans: campo de comissão por plano
7. DRE: implementar exportação Excel/PDF

## Regra de Ouro
- Verificar `isTelecom` antes de renderizar qualquer novo componente no dashboard
- Não alterar nenhum fluxo do segmento imobiliário
- Respeitar visibilidade (admin vs vendedor) em todos os novos dados
