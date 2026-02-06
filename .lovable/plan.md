

# Plano de Restauração dos Estágios Originais

## Diagnóstico

Foram identificados **142 leads** que precisam ter o estágio restaurado. A redistribuição incorreta chamou `handle_lead_intake`, que resetou os leads para "Contato inicial".

Os estágios originais foram preservados no histórico de atividades (`activities.metadata->>'from_stage_id'`).

## Estágios Afetados

| Estágio Original | Leads |
|-----------------|-------|
| qualificação | ~100 |
| Follow up | ~15 |
| Venda ganha/pós venda | ~10 |
| Não responde | ~8 |
| Outros | ~9 |

---

## SQL para Restaurar os Estágios

Execute este SQL no **Supabase SQL Editor** (ambiente Live):

```sql
-- Restaurar o stage_id original baseado nas atividades de stage_change
-- que ocorreram durante a redistribuição em massa (19:02)

WITH original_stages AS (
  SELECT DISTINCT ON (a.lead_id)
    a.lead_id,
    (a.metadata->>'from_stage_id')::uuid as original_stage_id
  FROM activities a
  WHERE a.type = 'stage_change'
    AND a.created_at >= '2026-02-06 19:02:00'
    AND a.created_at < '2026-02-06 19:03:00'
    AND a.metadata->>'to_stage' = 'Contato inicial'
    AND a.metadata->>'from_stage_id' IS NOT NULL
  ORDER BY a.lead_id, a.created_at ASC
)
UPDATE leads
SET 
  stage_id = os.original_stage_id,
  stage_entered_at = NOW() -- Atualiza para aparecer no topo do Kanban
FROM original_stages os
WHERE leads.id = os.lead_id;
```

---

## Resultado Esperado

- **142 leads** restaurados aos estágios originais
- Leads aparecerão no topo de cada coluna do Kanban

---

## Resumo das Ações

| Passo | Status |
|-------|--------|
| ✅ Responsáveis restaurados | Concluído |
| ⏳ Estágios restaurados | **Você precisa executar o SQL acima** |
| ✅ Pool-checker corrigido | Concluído |

