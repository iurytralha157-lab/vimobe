
# Correção: Campo `metadata` inexistente

## Problema Identificado

O lead chegou corretamente às **16:36:09** mas falhou na inserção:

```
record "v_lead" has no field "metadata"
```

## Causa Raiz

Na linha 23 da função `handle_lead_intake`:
```sql
v_meta_form_id := v_lead.metadata->>'form_id';
```

A tabela `leads` não possui coluna `metadata`. O `meta_form_id` já é uma coluna direta:

| Coluna | Tipo |
|--------|------|
| `meta_lead_id` | text |
| `meta_form_id` | text |

## Correção

Alterar a linha para usar a coluna correta:
```sql
v_meta_form_id := v_lead.meta_form_id;
```

## Migração SQL

```sql
CREATE OR REPLACE FUNCTION handle_lead_intake(p_lead_id uuid)
RETURNS jsonb
-- ...
  -- ANTES (errado):
  -- v_meta_form_id := v_lead.metadata->>'form_id';
  
  -- DEPOIS (correto):
  v_meta_form_id := v_lead.meta_form_id;
```

## Arquivo Afetado

- Nova migração SQL para corrigir `handle_lead_intake`

## Resultado Esperado

Leads do Meta serão criados e distribuídos corretamente usando o campo `meta_form_id` que já existe na tabela `leads`.

## Confirmação do Lead Recebido

O webhook recebeu o lead com sucesso:
- **Lead ID**: 2397208057393361
- **Form ID**: 24938013762565906
- **Preço do imóvel**: R$ 2.250.000 (buscado automaticamente)
- **Tags automáticas**: 1 tag configurada

Apenas a distribuição falhou por causa do campo inexistente.
