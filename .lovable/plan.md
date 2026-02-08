
# Plano: Restaurar Função de Distribuição e Corrigir Lógica

## Problema Identificado
A migração anterior quebrou a distribuição porque usou nomes de colunas incorretos:
- ❌ `l.webhook_id` → ✅ `l.source_webhook_id`
- ❌ `l.whatsapp_session_id` → ✅ `l.source_session_id`
- ❌ `lm.form_id` buscado separadamente → ✅ Já carregado no JOIN inicial

## Solução
Restaurar a função `pick_round_robin_for_lead` para a versão que funcionava (migração `20260128154234`) **com a correção de arrays vazios aplicada corretamente**.

## Migração SQL a Aplicar

```sql
CREATE OR REPLACE FUNCTION public.pick_round_robin_for_lead(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_lead RECORD; 
  v_rule RECORD; 
  v_round_robin_id UUID; 
  v_lead_source TEXT; 
  v_lead_tags TEXT[];
  v_match JSONB;
  v_current_day INT;
  v_current_time TIME;
  v_schedule JSONB;
  v_property_category TEXT;
BEGIN
  -- Buscar dados do lead (usando colunas CORRETAS)
  SELECT l.*, p.default_round_robin_id, lm.campaign_id, lm.form_id,
         prop.tipo_de_negocio as property_category
  INTO v_lead 
  FROM public.leads l 
  LEFT JOIN public.pipelines p ON p.id = l.pipeline_id 
  LEFT JOIN public.lead_meta lm ON lm.lead_id = l.id
  LEFT JOIN public.properties prop ON prop.id = l.interest_property_id
  WHERE l.id = p_lead_id;
  
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  v_lead_source := v_lead.source::TEXT;
  v_current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/Sao_Paulo')::INT;
  v_current_time := (NOW() AT TIME ZONE 'America/Sao_Paulo')::TIME;
  v_property_category := v_lead.property_category;
  
  -- Buscar tags do lead
  SELECT ARRAY_AGG(t.name) INTO v_lead_tags 
  FROM public.lead_tags lt 
  JOIN public.tags t ON t.id = lt.tag_id 
  WHERE lt.lead_id = p_lead_id;
  
  -- Avaliar regras por prioridade
  FOR v_rule IN 
    SELECT rr.id as round_robin_id, rr.settings, rrr.* 
    FROM public.round_robin_rules rrr 
    JOIN public.round_robins rr ON rr.id = rrr.round_robin_id 
    WHERE rr.organization_id = v_lead.organization_id 
      AND rr.is_active = true 
      AND (rrr.is_active IS NULL OR rrr.is_active = true)
    ORDER BY COALESCE(rrr.priority, 0) DESC
  LOOP
    v_match := COALESCE(v_rule.match, '{}'::jsonb);
    
    -- Se match está vazio, usar match_type/match_value legado
    IF v_match = '{}'::jsonb THEN
      IF v_rule.match_type = 'source' AND v_lead_source = v_rule.match_value THEN 
        RETURN v_rule.round_robin_id; 
      END IF;
      -- (outras regras legadas...)
      CONTINUE;
    END IF;
    
    -- CORREÇÃO: Ignorar arrays vazios
    IF v_match ? 'source' AND jsonb_array_length(v_match->'source') > 0 THEN
      IF NOT (v_lead_source = ANY(ARRAY(SELECT jsonb_array_elements_text(v_match->'source')))) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- webhook_id usando source_webhook_id (coluna CORRETA)
    IF v_match ? 'webhook_id' AND jsonb_array_length(v_match->'webhook_id') > 0 THEN
      IF v_lead.source_webhook_id IS NULL OR NOT (...) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- meta_form_id usando form_id do JOIN (campo CORRETO)
    IF v_match ? 'meta_form_id' AND jsonb_array_length(v_match->'meta_form_id') > 0 THEN
      IF v_lead.form_id IS NULL OR NOT (...) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- (demais filtros com a mesma correção de array vazio...)
    
    RETURN v_rule.round_robin_id;
  END LOOP;
  
  -- Fallback para round-robins sem regras
  SELECT rr.id INTO v_round_robin_id 
  FROM public.round_robins rr
  WHERE rr.organization_id = v_lead.organization_id 
    AND rr.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.round_robin_rules rrr 
      WHERE rrr.round_robin_id = rr.id AND (rrr.is_active IS NULL OR rrr.is_active = true)
    )
  ORDER BY rr.created_at ASC 
  LIMIT 1;
  
  RETURN v_round_robin_id;
END; 
$function$;
```

---

## Mudanças Técnicas

| Item | Versão Quebrada | Versão Corrigida |
|------|-----------------|------------------|
| Coluna webhook | `l.webhook_id` | `l.source_webhook_id` |
| Coluna WhatsApp | `l.whatsapp_session_id` | `l.source_session_id` |
| Form ID | Buscado separadamente | `lm.form_id` (JOIN) |
| Arrays vazios | Causam falha | Ignorados |
| Fallback | Removido | Restaurado |

---

## Resultado Esperado
1. Leads do Meta voltarão a ser criados
2. A correção de arrays vazios será aplicada corretamente
3. O matching por `meta_form_id` funcionará

---

## Próximos Passos
1. Aprovar migração SQL para restaurar a função
2. Testar envio de lead do Meta
3. Verificar que o lead é distribuído para a fila correta
