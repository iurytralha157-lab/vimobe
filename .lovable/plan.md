
# Plano de Recuperação - Bolsão Nexo Imóveis

## Situação Identificada

| Métrica | Valor |
|---------|-------|
| Organização | Nexo Imóveis |
| Total de leads afetados | 161 |
| Leads que PRECISAM de rollback | 132 (usuário mudou) |
| Leads que ficaram igual | 29 (mesmo usuário) |
| Período da redistribuição | ~05:08 - 05:09 UTC (há ~6 minutos) |

## O que aconteceu

O pool-checker redistribuiu os leads porque:
1. Os leads estavam em estágios de "Contato inicial" 
2. Não tinham `first_touch_at` (nenhum contato registrado)
3. O `pool_timeout_minutes` foi atingido

## Ação de Recuperação

Vou executar um UPDATE que:
1. **Restaurar o `assigned_user_id` original** de cada lead
2. Usar o histórico do `lead_pool_history` para obter o usuário correto
3. Atualizar apenas os 132 leads que realmente mudaram de usuário

**Nota**: Os estágios NÃO foram alterados pelo bolsão - ele só muda o usuário responsável. Os leads continuam no mesmo estágio ("Contato inicial").

## SQL de Rollback

```sql
-- Rollback: Restaurar usuários originais dos leads redistribuídos
-- Baseado no histórico do lead_pool_history

UPDATE leads l
SET 
  assigned_user_id = rollback.original_user_id,
  assigned_at = NOW() -- Reset timestamp para evitar re-redistribuição imediata
FROM (
  -- Pegar o PRIMEIRO from_user_id de cada lead (o usuário original antes do ciclo de redistribuição)
  SELECT DISTINCT ON (lead_id)
    lead_id,
    from_user_id as original_user_id
  FROM lead_pool_history
  WHERE organization_id = '818394bf-8c57-445e-be2f-b964c2569235'
    AND redistributed_at > NOW() - INTERVAL '15 minutes'
    AND from_user_id != to_user_id
  ORDER BY lead_id, redistributed_at ASC
) rollback
WHERE l.id = rollback.lead_id;
```

## Ação Adicional: Desativar o Bolsão

Após o rollback, vou desativar o pool para evitar nova redistribuição:

```sql
-- Desativar pool temporariamente para a organização Nexo
UPDATE pipelines
SET pool_enabled = false
WHERE organization_id = '818394bf-8c57-445e-be2f-b964c2569235';
```

## Resultado Esperado

- 132 leads voltarão aos usuários originais
- Os estágios permanecem iguais (bolsão não altera estágio)
- Pool será desativado para evitar repetição
