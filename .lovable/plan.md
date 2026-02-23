
# Corrigir Plano nos Negocios e Adicionar Comissao ao Plano Telecom

## Problemas identificados

1. **Plano nao aparece em "Negocios"**: Quando o plano e selecionado na aba "Contrato" do formulario de criacao, ele e salvo apenas no `telecom_customers.plan_id`, mas NAO no campo `interest_plan_id` do lead. Por isso, na aba "Negocios" do card do lead, o plano aparece como "Nenhum".

2. **Valor de interesse nao preenche**: Ao selecionar o plano na criacao, o valor do plano (`price`) nao e copiado para `valor_interesse` do lead.

3. **Comissao do vendedor nao existe no plano**: A tabela `service_plans` nao tem campo de comissao. Precisa de uma coluna `commission_percentage` para configurar a comissao por plano.

## Solucao em 3 partes

### Parte 1 - Banco de dados
Adicionar coluna `commission_percentage` (NUMERIC, default NULL) na tabela `service_plans`.

### Parte 2 - Formulario do Plano (PlanFormDialog.tsx)
Adicionar campo "Comissao do vendedor (%)" ao lado do campo "Valor (R$)" no formulario de criacao/edicao de plano. Atualizar o tipo `CreateServicePlanInput` e `ServicePlan` no hook `use-service-plans.ts` para incluir `commission_percentage`.

### Parte 3 - Sincronizar plano com negocios

**CreateLeadDialog.tsx** (formulario de criacao):
- Quando o usuario selecionar um plano na aba "Contrato", auto-preencher `valor_interesse` com o `price` do plano
- Ao submeter, salvar o `interest_plan_id` no lead junto com `valor_interesse` e `commission_percentage` do plano
- Isso garante que ao abrir o card do lead, a aba "Negocios" ja mostra o plano correto

**LeadDetailDialog.tsx** (card do lead - Desktop e Mobile):
- Quando o usuario selecionar um plano em "Negocios", alem de preencher `valor_interesse`, tambem preencher `commission_percentage` com o valor configurado no plano
- Isso ja funciona parcialmente (preenche valor) mas falta a comissao

## Detalhes tecnicos

### Migration SQL
```sql
ALTER TABLE service_plans ADD COLUMN commission_percentage NUMERIC DEFAULT NULL;
```

### use-service-plans.ts
- Adicionar `commission_percentage?: number | null` em `ServicePlan` e `CreateServicePlanInput`

### PlanFormDialog.tsx
- Adicionar campo `commission_percentage` na grid ao lado de "Velocidade (MB)" ou "Valor (R$)"
- Input numerico com step 0.1, placeholder "Ex: 10"

### CreateLeadDialog.tsx
- No `onValueChange` do Select de plano (aba "Contrato", linha ~578), ao selecionar um plano:
  - Preencher `valor_interesse` com `plan.price`
  - Armazenar `plan_id` (ja faz isso)
- No `handleSubmit`, adicionar ao payload do `createLead`:
  - `interest_plan_id: formData.plan_id || undefined`
  - `commission_percentage` do plano selecionado

### LeadDetailDialog.tsx (Desktop e Mobile)
- No `onValueChange` do Select "Plano de interesse" (linhas ~1224 e ~1979):
  - Adicionar `commission_percentage` do plano ao `updateData`
  - Preencher `editForm.commission_percentage` com o valor do plano
