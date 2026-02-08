
# Plano: Corrigir Sistema de Distribuição Round Robin

## Resumo do Problema
Leads do Meta não estão sendo distribuídos mesmo com filas ativas. O problema está na função de matching que interpreta arrays vazios como "nenhum valor válido" em vez de "ignorar esta condição".

## Diagnóstico Técnico
A regra da fila "teste" tem:
1. Regra `source: []` (array vazio) com prioridade 1 - O sistema interpreta como "lead precisa ter source igual a NADA" (impossível), então FALHA
2. Regra `meta_form_id: [24938013762565906]` com prioridade 2 - Nunca é avaliada por causa da ordem de prioridade

A lógica atual na função `pick_round_robin_for_lead`:
```sql
IF v_match ? 'source' THEN
  IF NOT (v_lead_source = ANY(ARRAY(SELECT jsonb_array_elements_text(v_match->'source')))) THEN
    CONTINUE; -- FALHA se array vazio
  END IF;
END IF;
```

## Solução

### 1. Corrigir a lógica de matching na função SQL
Modificar a função `pick_round_robin_for_lead` para ignorar condições com arrays vazios em vez de falhar:

```sql
-- ANTES (problemático):
IF v_match ? 'source' THEN
  IF NOT (v_lead_source = ANY(...)) THEN
    CONTINUE;
  END IF;
END IF;

-- DEPOIS (correto):
IF v_match ? 'source' AND jsonb_array_length(v_match->'source') > 0 THEN
  IF NOT (v_lead_source = ANY(...)) THEN
    CONTINUE;
  END IF;
END IF;
```

### 2. Aplicar a mesma correção para todos os tipos de regras
- `source`
- `webhook_id`
- `whatsapp_session_id`
- `meta_form_id`
- `website_category`
- `tag_in`
- `city_in`

### 3. Alternativa: Corrigir no Frontend
Impedir que regras sem valores sejam salvas (remover condições vazias antes do save).

---

## Arquivos a Modificar

### Migração SQL (prioridade 1)
Atualizar a função `pick_round_robin_for_lead` para ignorar arrays vazios:

```sql
CREATE OR REPLACE FUNCTION public.pick_round_robin_for_lead(p_lead_id uuid)
...
-- Verificar source (IGNORAR se array vazio)
IF v_match ? 'source' AND jsonb_array_length(v_match->'source') > 0 THEN
  IF NOT (v_lead_source = ANY(ARRAY(SELECT jsonb_array_elements_text(v_match->'source')))) THEN
    CONTINUE;
  END IF;
END IF;

-- Verificar webhook específico (IGNORAR se array vazio)
IF v_match ? 'webhook_id' AND jsonb_array_length(v_match->'webhook_id') > 0 THEN
  ...
END IF;

-- Repetir para todos os tipos de array
...
```

### Frontend (opcional, melhoria UX)
**`src/hooks/use-create-queue-advanced.ts`**
Filtrar condições vazias antes de salvar:

```typescript
// Filtrar condições sem valores (evita criar regras impossíveis)
const validConditions = input.conditions.filter(c => c.values.length > 0);
```

---

## Resultado Esperado
Após a correção:
1. Regras com arrays vazios serão ignoradas (não causarão falha)
2. A regra `meta_form_id: [24938013762565906]` fará match corretamente
3. Leads do Meta serão distribuídos automaticamente para a fila "teste"

---

## Verificação
Após aplicar a migração:
1. Enviar um novo lead do Meta
2. Verificar na timeline que o lead foi distribuído (não mais "Pool - nenhuma fila encontrada")
3. Confirmar que o lead foi atribuído a um dos membros da fila
