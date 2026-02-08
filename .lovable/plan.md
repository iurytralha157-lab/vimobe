
# Plano: Corrigir Lógica de Matching para Arrays Vazios

## Problema Identificado
A função `pick_round_robin_for_lead` falha quando uma regra tem arrays vazios (ex: `source: []`). Isso faz com que a regra com `meta_form_id` válido nunca seja avaliada.

## Solução

### Migração SQL
Atualizar a função para ignorar filtros com arrays vazios:

```sql
-- ANTES (problemático):
IF v_match ? 'source' THEN
  IF NOT (v_lead_source = ANY(...)) THEN
    CONTINUE;
  END IF;
END IF;

-- DEPOIS (seguro):
IF v_match ? 'source' AND jsonb_array_length(v_match->'source') > 0 THEN
  IF NOT (v_lead_source = ANY(...)) THEN
    CONTINUE;
  END IF;
END IF;
```

### Filtros a Corrigir
- `source` (linha 76)
- `webhook_id` (linha 82)
- `whatsapp_session_id` (linha 90)
- `meta_form_id` (linha 98)
- `website_category` (linha 107)
- `tag_in` (linha 122)
- `city_in` (linha 131)

### Frontend (Prevenção)
Atualizar `src/hooks/use-create-queue-advanced.ts` para filtrar condições vazias antes de salvar.

## Segurança
- A migração apenas adiciona verificações de tamanho de array
- Se a correção falhar, leads continuam indo para o Pool (comportamento atual)
- Nenhuma alteração na estrutura de dados ou no fluxo de entrada de leads

## Resultado Esperado
Leads do Meta serão distribuídos corretamente para a fila "teste" quando a regra `meta_form_id` fizer match.
