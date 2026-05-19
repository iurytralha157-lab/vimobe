# Refatoração do Módulo Financeiro — Vimob CRM

## Escopo

Módulo financeiro 100% imobiliário, dark-only, automatizado e integrado ao CRM. 12 etapas agrupadas em **5 fases** entregáveis e testáveis isoladamente. Cada fase é validada antes da próxima.

## Estado atual mapeado

**Banco (já existe, vamos aproveitar):**
- `financial_entries` (47 linhas) — tem `type`, `category`, `amount`, `due_date`, `paid_date`, `status`, `broker_id`, `contract_id`, `lead_id`, recorrência, parcelas
- `contracts` (2 linhas) — tem `lead_id`, `property_id`, `value`, `commission_value/percentage`, `status`, datas, `attachments` jsonb, dados de cliente
- `commissions` (14 linhas) — tem `user_id`, `contract_id`, `property_id`, `base_value`, `percentage`, `calculated_value`, `status`, `forecast_date`, `approved_at`, `paid_at`
- `commission_rules`, `financial_categories` (60 linhas), `contract_brokers`

**Frontend (será reescrito por etapa):** Dashboard (498), Entries (477), Commissions (739), DRE (305), ExecutiveDRE (337), Reports (591), ContractForm (575), FinancialEntryForm (434), SmartEntryForm (364), hooks (~1.4k linhas).

## Fase 1 — UI/Tema (Etapas 9 + 2 + parte da 12)

**Quick wins visuais. Sem regras de negócio novas.**

1. **DRE Executivo dark** — substituir backgrounds brancos por `bg-background`/`bg-card`, texto por `text-foreground`, bordas por `border`. Botão Exportar com `variant="outline"`. Estado vazio dark com CTA.
2. **Filtro "Obra" → "Imóvel"** no DRE Executivo, lista vinda de `properties`.
3. **Drawer pattern padronizado** — criar `<FinancialDrawer>` wrapper sobre `Sheet` (480px desktop, full mobile, side="right"). Migrar:
   - `FinancialEntryForm` / `SmartEntryForm` (Novo Lançamento)
   - `ContractForm` (Novo Contrato + edição)
   - Form de Comissão (Commissions.tsx)
   - Regras de Comissão
   - Drawer "Detalhes do Contrato" (read-only com abas)
4. **Auditoria global** — varrer `src/pages/financial*` e `src/components/financial` removendo qualquer cor hardcoded (white, #fff, gray-50/100, etc.) e substituindo por tokens.

## Fase 2 — Dashboard correto (Etapa 1)

Reescrever `FinancialDashboard.tsx` + criar hook `use-financial-dashboard.ts` com queries reais agrupadas por período (mês atual vs mês anterior):

- **VGV:** `SUM(contracts.value) WHERE status='ativo' AND signing_date no período` OU `SUM(leads ganhos × valor_imovel)` no período — definir fonte canônica como contratos ativos (campo de origem real).
- **VGV Líquido:** VGV − `SUM(commissions.calculated_value WHERE status='paga')`.
- **Ticket Médio:** VGV ÷ COUNT contratos ativos do período; zero sem comparativo se vazio.
- **Receita Confirmada (30d):** `SUM(financial_entries WHERE type='receita' AND status='pago' AND paid_date >= now()-30d)` — substitui card enganoso de "Faturamento".
- **Comissões a Pagar:** `SUM(commissions WHERE status IN ('aprovada','pendente'))` — substitui Inadimplência.
- **Gráfico Fluxo de Caixa:** série mensal últimos 6m + próximos 3m, com 3 linhas (Receitas Realizadas, Despesas Realizadas, Previsão = pendentes futuras). Escala corrigida.
- **Resumo Comissões:** 3 buckets reais (`prevista`, `aprovada`, `paga`).
- **Forecast Anual:** soma de `commissions futuras (status != cancelada/paga)` + `financial_entries futuras pendentes`. Label: "Estimativa baseada em contratos e recebíveis futuros".
- **Botão Ver Relatório Detalhado:** `navigate('/financeiro/relatorios')`.

## Fase 3 — Contas + Contratos + Documentos (Etapas 3 + 4)

**Contas (`FinancialEntries` + form em drawer):**
- Categoria **obrigatória** (validação Zod + DB NOT NULL via migration se necessário) — seed das categorias padrão (Venda, Aluguel, Comissão, Marketing, Admin, Impostos, etc.) por organização se vazias.
- Campos opcionais: `property_id`, `lead_id`, `broker_id` (já existem no schema; faltam selects no form). Adicionar selects com busca.
- Filtros: tipo / status / período (Este mês / 30d / Personalizado / **Todos**).
- Job `pg_cron` diário às 02:00 marca `status='atrasado'` onde `due_date < today AND status='pendente'`.
- Invalidação React Query após mutação para refletir no Dashboard.

**Contratos:**
- Form em drawer, manter abas existentes + nova aba **Documentos**.
- Aba Documentos lê/escreve `contracts.attachments` (jsonb existente). Upload para bucket `contract-documents` (criar se não existir, com policies por organization). Tipos de doc enumerados, ícone, download, exclusão com confirm.
- Garantir todos os campos pedidos: tipo, lead, imóvel, corretor, valor, % comissão, valor comissão (auto = value × %/100), datas, status, observações.
- Trigger SQL `auto_generate_commission_on_contract` — quando `contract_type='venda' AND status='ativo'` insere uma `commissions` com `status='prevista'` se ainda não existir para o par (contract_id, broker principal). Reaproveitar `use-auto-create-contract.ts`.

## Fase 4 — Comissões + Previsão + Automações (Etapas 5 + 6 + 10)

**Comissões (`Commissions.tsx` em drawer):**
- Fluxo de status fixo: `prevista → pendente → aprovada → paga → (cancelada)`. Botões contextuais por status. Sem skip de etapas.
- Campos completos + Histórico de alterações via nova tabela `commission_history` (migration: id, commission_id, changed_by, from_status, to_status, changed_at, notes).
- Ao mudar para `paga`: trigger insere `financial_entry` automática (`type='despesa'`, `category='Comissão Paga'`, `broker_id`, `amount=calculated_value`, `paid_date=now`, `status='pago'`).
- Aba **Regras**: CRUD em `commission_rules` (% padrão, override por corretor, override por tipo de imóvel — adicionar colunas `user_id`, `property_type` à tabela existente via migration).

**Previsão:**
- Nova aba "Previsão" em `Commissions.tsx` + card no Dashboard.
- Timeline agrupada por mês com Receitas Futuras (entries pendentes futuras), Comissões Futuras, Total. Buckets 30/60/90 dias.

**Automação lead ganho → financeiro:**
- Trigger em `leads` quando `status` muda para `ganho`: cria `financial_entry` (a receber) e `commission` (prevista). Idempotente (não duplica se já existir).
- Realtime invalidações no front via `useFinancialRealtimeBus` (novo, mesmo padrão do `WhatsAppRealtimeBus`) escutando `financial_entries`, `commissions`, `contracts` por org e invalidando caches do Dashboard/Relatórios/DRE.

## Fase 5 — Relatórios + DRE auto-init (Etapas 7 + 8 + 11 + 12)

**Relatórios (`FinancialReports.tsx`):**
- Filtro padrão: detecta se mês atual está vazio, cai para "Últimos 12 meses".
- Novo relatório **Comissões** dedicado (por corretor / imóvel / período, totais Pendentes/Aprovadas/Pagas).
- Validar e padronizar filtros obrigatórios em todos: período, tipo, status, corretor, imóvel.
- Exportação CSV (já existe) — validar Excel funcional via lib `xlsx` se já presente, senão CSV apenas.

**DRE auto-init:**
- RPC `ensure_default_dre_structure(org_id)` chamada na entrada do `FinancialDRE` — popula `financial_categories` com `category_group` padrão (Receita Operacional, Deduções, Despesas Operacionais, Resultado) se ainda não houver. Idempotente.
- Estrutura imobiliária padrão exatamente como especificado.
- Regimes Caixa/Competência via filtro de data (`paid_date` vs `due_date`).

**Validações DB (migration consolidada):**
- `commissions`: NOT NULL em `user_id`, `organization_id`, `base_value`, `percentage`, `calculated_value`, `status`. Trigger BEFORE INSERT/UPDATE recalcula `calculated_value = base_value * percentage / 100`.
- `financial_entries`: NOT NULL em `category` (com default 'Outros'), check em `amount > 0`.
- `contracts`: NOT NULL em `contract_type`, `value`, `status`, `organization_id`.

**Checklist Etapa 12** vira QA final manual no preview antes de fechar a refatoração.

## Detalhes técnicos

```text
Arquivos novos:
  src/components/financial/FinancialDrawer.tsx        (wrapper Sheet)
  src/components/financial/ContractDocumentsTab.tsx
  src/components/financial/CommissionHistoryTimeline.tsx
  src/contexts/FinancialRealtimeBus.tsx
  src/hooks/use-financial-dashboard.ts
  src/hooks/use-commission-forecast.ts
  src/pages/financial/CommissionsReport.tsx

Arquivos reescritos:
  src/pages/FinancialDashboard.tsx
  src/pages/FinancialEntries.tsx     (filtros + drawer)
  src/pages/Commissions.tsx          (fluxo status + previsão)
  src/pages/FinancialDRE.tsx         (auto-init)
  src/pages/financial/ExecutiveDRE.tsx (dark)
  src/components/financial/{Contract,FinancialEntry,Smart}Form.tsx (Sheet)

Migrações SQL (uma por fase):
  20260520_phase3_entries_categories_required.sql
  20260520_phase3_contract_documents_bucket.sql
  20260521_phase4_commission_history.sql
  20260521_phase4_commission_rules_overrides.sql
  20260521_phase4_lead_won_to_financial_trigger.sql
  20260521_phase4_commission_paid_to_entry_trigger.sql
  20260521_phase4_overdue_entries_cron.sql
  20260522_phase5_dre_default_structure_rpc.sql
  20260522_phase5_financial_validations.sql
```

Cada fase termina com: build verde + smoke test manual (você testa no preview e aprova) → próxima fase.

## Confirmação pedida

Posso seguir executando **Fase 1** (UI/dark/drawers) já em seguida ao approve deste plano, ou prefere que eu rode todas as 5 fases sem pausa? Recomendo fase a fase para você validar visualmente cada bloco antes de avançar.