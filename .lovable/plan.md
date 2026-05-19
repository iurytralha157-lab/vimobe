## Diagnóstico

O campo `won_at` **já é gravado corretamente** quando um lead vira "ganho" (em `src/hooks/use-deal-status-change.ts` linha 49). O problema está **apenas na leitura da dashboard**: ela filtra os leads pela **data de criação** (`created_at`) e só depois conta quantos desse subconjunto têm `deal_status='won'`.

Resultado prático: uma venda fechada hoje, de um lead criado mês passado, **não aparece** na dashboard de "este mês" — ela aparece no mês em que o lead entrou. É exatamente o comportamento que você descreveu.

A correção é tratar leads ganhos como um conjunto separado, filtrado por `won_at` dentro do período da dashboard, somando-se aos leads novos (que continuam filtrados por `created_at`).

## Arquivos afetados

Tudo em `src/hooks/use-dashboard-stats.ts`:

1. **KPIs principais (linhas ~135–175)** — "Vendas Ganhas" e "VGV / Valor de vendas"
   - Hoje: filtra `leads` por `created_at` no período, conta `deal_status='won'` dentro disso.
   - Novo: fazer uma **segunda query** buscando `leads` com `deal_status='won'` e `won_at` dentro do período. Os KPIs `closedLeads` e `totalSalesValue` passam a vir dessa query.
   - "Total de Leads" e "Taxa de conversão" continuam baseados em `created_at` (são métricas de captação / período de origem).
   - A taxa de conversão passa a ser exibida como "vendas do período ÷ leads do período" (mantém leitura operacional).

2. **Ranking de corretores (linhas ~430–480)**
   - Já filtra por `deal_status='won'`. Ajustar o `dateRange` para filtrar por `won_at` em vez de `created_at`.

3. **Evolução de Negócios — gráfico (linhas ~770–815)**
   - Hoje: agrupa todos os leads por `created_at` e classifica por status no balde da data de criação.
   - Novo: separar em dois conjuntos por intervalo do gráfico:
     - **Abertos** continuam contados por `created_at` (volume de entrada);
     - **Ganhos** contados por `won_at` dentro do intervalo;
     - **Perdas** contadas por `lost_at` dentro do intervalo.
   - Buscar os leads com um `select` que traga `created_at, won_at, lost_at, deal_status` e fazer a classificação em memória usando a data correta.

4. **Outras telas que já estão certas** (não precisam mudar):
   - `src/hooks/use-team-ranking.ts` — já usa `won_at`.
   - `src/pages/gamification/GamificationRanking.tsx` — já usa `won_at`.
   - `src/hooks/use-vgv.ts` — já seleciona `won_at`; checar se o filtro por período também usa `won_at`.
   - `src/hooks/use-financial.ts` (linha 327) — já busca leads `deal_status='won'`; confirmar se agrega por `won_at`.

## Comportamento esperado após o fix

- Lead criado em **agosto** e fechado em **outubro** aparece como venda ganha **em outubro** na dashboard, ranking e gráfico de evolução.
- KPI "Total de Leads" continua refletindo os leads que **entraram** no período (data de criação).
- KPI "Vendas Ganhas", "VGV" e "Ranking" passam a refletir o que foi **fechado** no período (data de ganho).
- Gráfico de Evolução mostra, em cada barra/intervalo, leads novos (entrada), ganhos (data da venda) e perdas (data da perda).

## Riscos / pontos de atenção

- Leads antigos sem `won_at` preenchido (caso existam) não vão aparecer nos novos KPIs. Se houver registros legados, podemos rodar um backfill simples: `UPDATE leads SET won_at = updated_at WHERE deal_status='won' AND won_at IS NULL`. **Confirmar com você** antes de aplicar o backfill.
- A taxa de conversão muda de semântica (passa a ser "fechado no período ÷ entrou no período"). Avisamos no tooltip do card.

## Próximo passo

Ao aprovar o plano, implemento as alterações em `use-dashboard-stats.ts` e valido visualmente na dashboard.