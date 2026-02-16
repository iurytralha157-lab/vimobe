
# Implementar Automacoes Inteligentes no Financeiro

## Visao Geral

Implementar 5 componentes de automacao financeira adaptados ao sistema existente. Os arquivos enviados precisam de ajustes para funcionar com o banco de dados e hooks atuais.

## Fase 1: Migracao de Banco de Dados

Adicionar coluna `paid_amount` na tabela `financial_entries` e trigger de status automatico.

**NAO sera usado `GENERATED ALWAYS AS`** (causa problemas com restauracao de backup). O calculo de `remaining_amount` sera feito no frontend.

```sql
ALTER TABLE financial_entries
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION update_entry_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount >= NEW.amount THEN
    NEW.status := 'paid';
    NEW.paid_date := COALESCE(NEW.paid_date, NOW()::date);
  ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.amount THEN
    NEW.status := 'partial';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_entry_status
BEFORE UPDATE ON financial_entries
FOR EACH ROW
EXECUTE FUNCTION update_entry_status_on_payment();
```

## Fase 2: Criar `src/lib/category-detector.ts`

Biblioteca pura (sem dependencias externas) que analisa a descricao digitada e retorna:
- Categoria sugerida (ex: "Aluguel", "Energia Eletrica", "Comissao")
- Tipo (payable/receivable)
- Se e recorrente e qual frequencia
- Valor extraido do texto (ex: "R$ 5.000" -> 5000)
- Nivel de confianca (0-100%)

Baseado em regras de pattern matching com dicionario de palavras-chave em portugues. Nao depende de IA externa.

## Fase 3: Criar `src/hooks/use-smart-installments.ts`

Hook que calcula parcelas inteligentes para contratos.

**Adaptacoes necessarias vs arquivo original:**
- Usar `paid_value` (coluna existente) + `paid_amount` (nova coluna) para compatibilidade
- Remover referencia a `remaining_amount` como coluna gerada -- calcular no JS
- Usar `useAuth()` para pegar `organization_id` (padrao do projeto)
- Calculo de multa por atraso: 2% + 0.033%/dia (padrao brasileiro)
- Calculo de juros via Sistema Price

**Funcionalidades:**
- `useSmartInstallments(contractId)` -- lista parcelas com status enriquecido
- `usePayInstallment()` -- pagar parcela (total ou parcial)
- Cada parcela retorna: label (1/10), valor, vencimento, dias atraso, multa, se pode editar

## Fase 4: Criar `src/hooks/use-auto-create-contract.ts`

Hook que automatiza tudo quando lead e marcado como Ganho.

**Adaptacoes necessarias vs arquivo original:**
- `logAuditAction` usa parametros posicionais: `(action, entityType, entityId, oldData, newData, orgId)` -- o arquivo original usava formato de objeto
- `organization_id` vem de `profile.organization_id` via `useAuth()` -- o arquivo original buscava de `user_metadata`
- Reutilizar `generateContractNumber()` do `use-contracts.ts` existente
- Usar `useCreateContract`, `useCreateFinancialEntry` existentes internamente

**Fluxo automatico:**
1. Cria contrato com numero sequencial (CTR-YYYY-XXXXX)
2. Gera entrada (se downPayment > 0)
3. Gera N parcelas receivable numeradas (1/N, 2/N...)
4. Cria comissoes para cada corretor
5. Cria contas a pagar (comissao)
6. Atualiza lead como won
7. Registra auditoria

## Fase 5: Criar `src/components/financial/SmartEntryForm.tsx`

Formulario inteligente que preenche campos automaticamente enquanto o usuario digita.

**Adaptacoes necessarias vs arquivo original:**
- Remover `useCostCenters` (tabela nao existe)
- Remover campo `cost_center_id` e `requires_approval` (colunas nao existem)
- Usar `useCreateFinancialEntry` e `useUpdateFinancialEntry` existentes
- Usar `useFinancialCategories` existente para listar categorias do banco
- Integrar `detectCategory()` do category-detector para auto-fill

**Comportamento:**
- Ao digitar descricao, detecta categoria, tipo e recorrencia em tempo real
- Mostra badge de confianca (Alta/Media/Baixa)
- Toggle para ligar/desligar auto-fill
- Extrai valor do texto (ex: "R$ 5.000" preenche o campo valor)

## Fase 6: Atualizar Edge Function `smart-recurring-generator`

Substituir a edge function `recurring-entries-generator` existente por versao inteligente.

**Adaptacoes necessarias vs arquivo original:**
- Remover referencia a `cost_center_id` (coluna nao existe)
- Usar `create_notification` RPC existente em vez de inserir em `system_alerts` (tabela nao existe)
- Corrigir insercao em `notifications`: coluna e `content` (nao `message`), `is_read` (nao `read`)
- Manter CORS headers (ja presentes no padrao do projeto)
- Manter `Deno.serve()` (padrao atual)

**Funcionalidades novas vs versao atual:**
- Detecta quando valor de entrada recorrente mudou (reajuste)
- Notifica admins sobre mudancas de valor
- Identifica possiveis cancelamentos (entradas sem movimentacao)
- Melhor logging e metricas

## Arquivos Criados/Modificados

| Arquivo | Acao |
|---------|------|
| `src/lib/category-detector.ts` | Criar novo |
| `src/hooks/use-smart-installments.ts` | Criar novo |
| `src/hooks/use-auto-create-contract.ts` | Criar novo |
| `src/components/financial/SmartEntryForm.tsx` | Criar novo |
| `supabase/functions/smart-recurring-generator/index.ts` | Criar novo |
| Migracao SQL | `paid_amount` + trigger |

## O que NAO sera implementado

- **Centro de custo** (`cost_centers`): tabela nao existe. Pode ser adicionado em fase futura
- **Campo `requires_approval`**: coluna nao existe em `financial_entries`
- **Tabela `system_alerts`**: nao existe. Alertas usarao o sistema de `notifications` existente
- **Coluna `remaining_amount` GENERATED**: causa problemas com backup/restore. Calculo sera no JS

## Impacto no Sistema Existente

- A pagina `FinancialEntries.tsx` podera trocar o `FinancialEntryForm` pelo `SmartEntryForm` (opcional, ambos funcionam)
- O `SmartEntryForm` usa os mesmos hooks `useCreateFinancialEntry`/`useUpdateFinancialEntry` existentes
- O `useAutoCreateContract` pode ser integrado no pipeline quando lead e marcado como ganho
- A edge function `recurring-entries-generator` existente continuara funcionando; a nova `smart-recurring-generator` sera uma versao aprimorada separada
