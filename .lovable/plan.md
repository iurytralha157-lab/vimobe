
# Plano: Corrigir Erro "column prop.category does not exist"

## Problema Identificado

A migração que criei está referenciando `prop.category` na função `pick_round_robin_for_lead`, mas essa coluna não existe na tabela `properties`.

**Coluna correta:** `tipo_de_negocio` (que contém valores como "Venda" ou "Aluguel")

## Solução

Criar uma nova migração que corrija a função SQL, substituindo:
- `prop.category` por `prop.tipo_de_negocio`

---

## Seção Técnica

### Migração SQL

```sql
-- Corrigir função pick_round_robin_for_lead
-- Substituir prop.category por prop.tipo_de_negocio

CREATE OR REPLACE FUNCTION public.pick_round_robin_for_lead(p_lead_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_lead RECORD; 
  ...
BEGIN
  -- CORRIGIDO: prop.tipo_de_negocio ao invés de prop.category
  SELECT l.*, p.default_round_robin_id, lm.campaign_id, lm.form_id,
         prop.tipo_de_negocio as property_category
  INTO v_lead 
  FROM public.leads l 
  LEFT JOIN public.pipelines p ON p.id = l.pipeline_id 
  LEFT JOIN public.lead_meta lm ON lm.lead_id = l.id
  LEFT JOIN public.properties prop ON prop.id = l.interest_property_id
  WHERE l.id = p_lead_id;
  
  -- resto da função permanece igual...
END;
$function$;
```

### Mudança Específica

| Antes (Errado) | Depois (Correto) |
|----------------|------------------|
| `prop.category as property_category` | `prop.tipo_de_negocio as property_category` |

### Arquivo a Criar

Nova migração SQL que recria a função com a coluna correta.

### Resultado

Após a correção, o webhook funcionará normalmente e poderá processar leads com `property_id` no payload.
