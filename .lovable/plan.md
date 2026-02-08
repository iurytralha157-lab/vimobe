
# Correção: Tabela `lead_timeline` não existe

## Problema Identificado

O último lead do Meta às **22:09:06** falhou com:
```
relation "lead_timeline" does not exist
```

## Causa Raiz

A migração anterior introduziu um nome de tabela errado na função `handle_lead_intake`:

| Usado (errado) | Correto |
|----------------|---------|
| `lead_timeline` | `lead_timeline_events` |

Além disso, as colunas também estão incorretas:

```sql
-- Código atual (errado):
INSERT INTO lead_timeline (lead_id, event_type, event_data, created_by)

-- Deveria ser:
INSERT INTO lead_timeline_events (lead_id, organization_id, user_id, event_type, title, description, metadata)
```

## Correção

Atualizar a função `handle_lead_intake` para usar a tabela correta com as colunas corretas:

```sql
-- Criar evento de timeline com tabela e colunas corretas
INSERT INTO lead_timeline_events (
  lead_id, 
  organization_id, 
  user_id, 
  event_type, 
  title, 
  description, 
  metadata
)
VALUES (
  p_lead_id,
  v_org_id,
  v_next_user_id,
  'lead_created',
  'Lead criado',
  'Lead criado e distribuído automaticamente via Round Robin',
  jsonb_build_object(
    'source', v_lead.source,
    'pipeline_id', v_queue.target_pipeline_id,
    'stage_id', v_queue.target_stage_id,
    'assigned_user_id', v_next_user_id,
    'round_robin_id', v_queue.id
  )
);
```

## Arquivo Afetado

- Nova migração SQL para corrigir a função `handle_lead_intake`

## Resultado Esperado

Leads do Meta serão criados, distribuídos e registrados na timeline corretamente.
