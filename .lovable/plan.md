

# Plano de Recuperação Completa - Bolsão Nexo Imóveis

## Diagnóstico Final

O bolsão não só redistribuiu os leads entre usuários, mas também **moveu todos eles para o estágio inicial** ("Contato inicial") porque a função `handle_lead_intake` aplica o `target_stage_id` da fila de Round Robin.

### Status Atual

| Situação | Quantidade |
|----------|------------|
| Precisa restaurar estágio | **114 leads** |
| Sem histórico (ficam em "Contato inicial") | 40 leads |
| Estágio já correto | 7 leads |
| **Total afetados** | 161 leads |

### Estágios a Restaurar

| Estágio Original | Leads |
|-----------------|-------|
| Qualificação | 108 |
| Perdido | 5 |
| Follow up | 1 |

### Situação dos Usuários

O rollback anterior **funcionou** - os usuários já foram restaurados para os originais. O problema é apenas o **estágio**.

## Ação de Recuperação

Executar um UPDATE que restaura o `stage_id` de cada lead baseado no histórico de atividades (`activities.type = 'stage_change'`) de antes das 05:08 UTC.

### SQL de Rollback dos Estágios

```sql
-- Restaurar estágios originais dos leads redistribuídos
-- Baseado no histórico de activities (stage_change) antes da redistribuição

UPDATE leads l
SET 
  stage_id = estagio.stage_id_antes,
  stage_entered_at = NOW()
FROM (
  SELECT DISTINCT ON (a.lead_id)
    a.lead_id,
    (a.metadata->>'to_stage_id')::uuid as stage_id_antes
  FROM activities a
  WHERE a.type = 'stage_change'
    AND a.created_at < '2026-02-04 05:08:00+00'
    AND a.lead_id IN (
      SELECT DISTINCT lead_id 
      FROM lead_pool_history 
      WHERE organization_id = '818394bf-8c57-445e-be2f-b964c2569235'
        AND redistributed_at > NOW() - INTERVAL '30 minutes'
    )
  ORDER BY a.lead_id, a.created_at DESC
) estagio
WHERE l.id = estagio.lead_id
  AND l.stage_id != estagio.stage_id_antes;
```

## Resultado Esperado

- **114 leads** voltarão para seus estágios originais (Qualificação, Perdido, Follow up)
- **40 leads** permanecerão em "Contato inicial" (não tinham histórico de movimentação)
- Os usuários já estão restaurados pelo rollback anterior
- O bolsão já está desativado para a organização

## Seção Técnica

A função `redistribute_lead_from_pool` chama `handle_lead_intake`, que por sua vez:
1. Busca a fila de Round Robin ativa
2. Se a fila tem `target_pipeline_id` e `target_stage_id` configurados, **aplica esses valores ao lead**
3. Isso resultou em todos os leads sendo movidos para o estágio inicial

Este comportamento precisará ser corrigido no futuro para que o bolsão **não altere o estágio** dos leads - apenas o usuário responsável.
