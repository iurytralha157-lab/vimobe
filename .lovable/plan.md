
# Correção: Lead do Meta não está sendo distribuído

## Problema Identificado

Os logs mostram claramente o erro:
```
ERROR: column rr.source_filter does not exist
```

A função `handle_lead_intake` está tentando usar uma coluna `source_filter` que **não existe** na tabela `round_robins`. A estrutura de regras utiliza a tabela separada `round_robin_rules` com o campo `match`.

## Causa Raiz

A migração anterior criou a função `handle_lead_intake` com lógica própria de matching usando `rr.source_filter`, mas:

| Coluna usada (errada) | Estrutura correta |
|-----------------------|-------------------|
| `round_robins.source_filter` | `round_robin_rules.match` (JSONB) |

O sistema já possui a função `pick_round_robin_for_lead()` que implementa **toda a lógica de matching corretamente**, incluindo:
- Source genérica, webhook IDs, sessões WhatsApp
- Formulários Meta (`meta_form_id`)
- Campanhas, tags, cidades, categorias de imóvel
- Horários de funcionamento
- Fallback para catch-all

## Solução

Refatorar `handle_lead_intake` para **reutilizar** `pick_round_robin_for_lead()` ao invés de implementar lógica duplicada:

```sql
CREATE OR REPLACE FUNCTION handle_lead_intake(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead RECORD;
  v_org_id uuid;
  v_queue RECORD;
  v_next_user_id uuid;
  v_matched_queue_id uuid;
BEGIN
  -- Buscar lead
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado: %', p_lead_id;
  END IF;
  
  v_org_id := v_lead.organization_id;
  
  -- ✅ USAR A FUNÇÃO QUE JÁ FUNCIONA
  v_matched_queue_id := pick_round_robin_for_lead(p_lead_id);
  
  -- Buscar dados da fila
  IF v_matched_queue_id IS NOT NULL THEN
    SELECT * INTO v_queue 
    FROM round_robins 
    WHERE id = v_matched_queue_id AND is_active = true;
  END IF;
  
  -- Se não encontrou fila, lead vai pro pool
  IF v_queue IS NULL THEN
    -- [timeline event para pool]
    RETURN;
  END IF;
  
  -- Selecionar próximo usuário usando leads_count e position
  SELECT rrm.user_id INTO v_next_user_id
  FROM round_robin_members rrm
  JOIN users u ON u.id = rrm.user_id
  WHERE rrm.round_robin_id = v_queue.id
    AND u.is_active = true
  ORDER BY rrm.leads_count ASC NULLS FIRST, rrm.position ASC
  LIMIT 1;
  
  -- [resto da lógica de atribuição...]
END;
$$;
```

## Benefícios

1. **Consistência**: Mesma lógica de matching do `generic-webhook`
2. **Manutenibilidade**: Uma única implementação para manter
3. **Funcionalidade completa**: Suporta todas as regras de matching (Meta form IDs, webhooks, horários, etc.)

## Arquivo Afetado

- Nova migração SQL para corrigir a função `handle_lead_intake`

## Resultado Esperado

Leads do Meta serão:
1. Recebidos pelo webhook ✅ (já funciona)
2. Criados no banco ✅ (INSERT funciona)
3. Distribuídos usando `pick_round_robin_for_lead` ✅ (será corrigido)
4. Registrados na timeline ✅ (já corrigido anteriormente)
