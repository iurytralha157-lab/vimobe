
# Correção Urgente: Colunas Obrigatórias Faltando

## Problema Identificado

A migração anterior corrigiu `actor_id → user_id`, mas a tabela `lead_timeline_events` tem duas colunas obrigatórias que não estão sendo preenchidas:

| Coluna | Obrigatória | Status Atual |
|--------|-------------|--------------|
| `organization_id` | ✅ NOT NULL | ❌ Faltando |
| `title` | ✅ NOT NULL | ❌ Faltando |

**Erro no log:**
```
null value in column "organization_id" of relation "lead_timeline_events" violates not-null constraint
```

---

## Solução

Atualizar a função `handle_lead_intake` para incluir as colunas obrigatórias nos INSERT de `lead_timeline_events`:

### Linha 45-59 (evento lead_created):
```sql
-- ANTES (incompleto)
INSERT INTO lead_timeline_events (lead_id, event_type, user_id, metadata)

-- DEPOIS (completo)
INSERT INTO lead_timeline_events (
  organization_id, lead_id, event_type, user_id, title, metadata
)
VALUES (
  v_lead.organization_id,
  p_lead_id, 
  'lead_created', 
  NULL,
  'Lead criado via ' || v_source_label,
  jsonb_build_object(...)
);
```

### Linha 170-181 (evento assignee_changed):
```sql
-- ANTES (incompleto)
INSERT INTO lead_timeline_events (lead_id, event_type, user_id, metadata)

-- DEPOIS (completo)
INSERT INTO lead_timeline_events (
  organization_id, lead_id, event_type, user_id, title, metadata
)
VALUES (
  v_lead.organization_id,
  p_lead_id,
  'assignee_changed',
  NULL,
  'Distribuído via Round Robin',
  jsonb_build_object(...)
);
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| Nova migração SQL | Atualizar `handle_lead_intake` adicionando `organization_id` e `title` |

---

## Resultado Esperado

Leads do Meta (e outras fontes) voltarão a ser criados com o histórico completo registrado corretamente.
