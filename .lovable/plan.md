

# Plano de Recuperação e Prevenção da Redistribuição Legada

## Diagnóstico

**200 leads únicos** foram redistribuídos incorretamente entre 19:02:00 e 19:02:27 (06/02/2026). Isso ocorreu porque:

1. O `pool-checker` verifica leads com `first_response_at IS NULL`
2. Este campo é novo, então todos os leads legados foram marcados como "sem contato"
3. O sistema redistribuiu em massa leads que já haviam sido atendidos

## Parte 1: Recuperar os Responsáveis Originais

### SQL para reverter as atribuições

A tabela `lead_pool_history` registra `from_user_id` (responsável original) para cada redistribuição. Vamos usar esses dados para restaurar:

```sql
-- Restaurar cada lead ao seu responsável original
-- Pega o PRIMEIRO from_user_id para cada lead (antes de qualquer redistribuição)
WITH first_assignment AS (
  SELECT DISTINCT ON (lead_id)
    lead_id,
    from_user_id
  FROM lead_pool_history
  WHERE redistributed_at > '2026-02-06 19:00:00'
    AND redistributed_at < '2026-02-06 19:05:00'
  ORDER BY lead_id, redistributed_at ASC
)
UPDATE leads
SET 
  assigned_user_id = fa.from_user_id,
  redistribution_count = 0
FROM first_assignment fa
WHERE leads.id = fa.lead_id;
```

### Resultado esperado
- 200 leads restaurados aos responsáveis originais
- Contador de redistribuição zerado

---

## Parte 2: Prevenir que Aconteça Novamente

### Modificar o `pool-checker` para filtrar leads legados

Adicionar um filtro que só considera leads **criados após a ativação do pool** OU que tenham `assigned_at` recente. Duas opções:

**Opção A - Filtrar por data de criação do lead:**
```typescript
// Só considerar leads criados nos últimos X dias (ex: 7 dias)
.gt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
```

**Opção B - Usar campo de habilitação da pipeline (recomendado):**
Adicionar coluna `pool_enabled_at` na tabela `pipelines` e só redistribuir leads com `assigned_at > pool_enabled_at`.

### Implementação Recomendada

Modificar a Edge Function `pool-checker`:

```typescript
// Adicionar filtro: só leads atribuídos DEPOIS de hoje às 19:00
// Ou seja, leads novos a partir de agora
const poolActivationDate = '2026-02-06T19:30:00.000Z';

const { data: leads, error: leadsError } = await supabase
  .from("leads")
  .select("id, name, organization_id, assigned_user_id, assigned_at, redistribution_count, pipeline_id")
  .eq("pipeline_id", pipeline.id)
  .not("assigned_user_id", "is", null)
  .not("assigned_at", "is", null)
  .is("first_response_at", null)
  .gt("assigned_at", poolActivationDate)  // ← NOVO FILTRO
  .lt("assigned_at", cutoffTime)
  .lt("redistribution_count", maxRedistributions);
```

---

## Parte 3: Sincronizar Dados Legados (Opcional mas Recomendado)

Para evitar problemas futuros, preencher `first_response_at` para leads que já tiveram alguma interação:

```sql
-- Preencher first_response_at baseado no histórico de mensagens WhatsApp
UPDATE leads
SET first_response_at = subquery.first_msg
FROM (
  SELECT DISTINCT ON (wm.lead_id)
    wm.lead_id,
    wm.created_at as first_msg
  FROM whatsapp_messages wm
  WHERE wm.is_from_me = true
  ORDER BY wm.lead_id, wm.created_at ASC
) subquery
WHERE leads.id = subquery.lead_id
  AND leads.first_response_at IS NULL;
```

---

## Ordem de Execução

| Passo | Ação | Tipo |
|-------|------|------|
| 1 | Executar SQL de restauração | Manual (SQL Editor) |
| 2 | Atualizar Edge Function pool-checker | Código |
| 3 | Reimplantar Edge Function | Deploy automático |
| 4 | (Opcional) Sincronizar dados legados | Manual (SQL Editor) |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/pool-checker/index.ts` | Adicionar filtro `.gt("assigned_at", poolActivationDate)` |

---

## Resumo Técnico

```text
┌─────────────────────────────────────────────────────────────┐
│                    SITUAÇÃO ATUAL                           │
├─────────────────────────────────────────────────────────────┤
│ 200 leads com responsáveis incorretos                       │
│ Histórico de redistribuição preservado em lead_pool_history │
│ Pool-checker rodando a cada 2 minutos                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    APÓS CORREÇÃO                            │
├─────────────────────────────────────────────────────────────┤
│ ✓ Leads restaurados aos responsáveis originais              │
│ ✓ Pool-checker ignora leads antigos                         │
│ ✓ Apenas leads NOVOS serão redistribuídos                   │
└─────────────────────────────────────────────────────────────┘
```

