
# Correção: Erro de JSON na Distribuição de Leads

## Problema Identificado

O erro atual é:
```
invalid input syntax for type json
```

Isso acontece porque o código usa operadores JSONB (`?`, `->`) em campos que podem ser NULL ou ter estrutura diferente do esperado.

## Causa Raiz

A função `handle_lead_intake` tenta executar:
```sql
rrr.match->'meta_form_id' ? v_meta_form_id
rrr.match->'source' ? v_lead.source
```

Porém, se `rrr.match` não contém a chave específica (ex: `meta_form_id`), a operação `->` retorna NULL, e usar `?` em NULL causa erro de JSON.

## Dados Reais

Os Round Robins atuais têm regras do tipo:
| match_type | match (JSONB) |
|------------|---------------|
| `interest_property` | `{"interest_property_id": "uuid"}` |
| `webhook` | `{"webhook_id": ["uuid"]}` |

**Não existe nenhuma regra para `source` ou `meta_form_id`**, então os leads do Meta estão falhando ao tentar fazer match.

## Solução

Reescrever a função com proteção COALESCE para evitar operações em NULL:

```sql
-- ANTES (causa erro)
rrr.match->'source' ? v_lead.source

-- DEPOIS (seguro)
COALESCE(rrr.match->'source', '[]'::jsonb) ? v_lead.source
```

Também precisamos usar `jsonb_typeof()` para verificar se é array antes de usar `?`.

## Mudanças Técnicas

| Local | Correção |
|-------|----------|
| Match `meta_form_id` | Usar COALESCE + verificar tipo array ou string |
| Match `source` | Usar COALESCE + verificar tipo array ou string |
| Match `interest_property` | Já usa `=` para string, OK |

## Migração SQL

```sql
-- Proteger operações JSONB com COALESCE
AND (
  -- Array check: {"meta_form_id": ["id1", "id2"]}
  (jsonb_typeof(rrr.match->'meta_form_id') = 'array' 
   AND rrr.match->'meta_form_id' ? v_meta_form_id)
  -- String check: {"meta_form_id": "id1"}
  OR rrr.match->>'meta_form_id' = v_meta_form_id
  -- Legacy field: match_value
  OR rrr.match_value = v_meta_form_id
)
```

## Arquivo Afetado

- Nova migração SQL para corrigir `handle_lead_intake`

## Resultado Esperado

Leads do Meta voltarão a ser criados e distribuídos corretamente, mesmo quando não houver regra específica (irão para o fallback ou ficarão no Pool).
