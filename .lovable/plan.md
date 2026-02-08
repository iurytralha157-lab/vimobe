
# Correção Urgente: Coluna `actor_id` não existe

## Problema
A migração que acabamos de aplicar tem um erro na linha 57:

```sql
-- ERRADO (atual)
INSERT INTO lead_timeline_events (lead_id, event_type, actor_id, metadata)

-- CORRETO (deveria ser)
INSERT INTO lead_timeline_events (lead_id, event_type, user_id, metadata)
```

A coluna correta é `user_id`, não `actor_id`. Por isso os leads do Meta estão falhando ao serem criados.

## Evidência do Erro
Log da Edge Function `meta-webhook`:
```
ERROR Error creating lead: {
  code: "42703",
  message: 'column "actor_id" of relation "lead_timeline_events" does not exist'
}
```

## Solução
Criar uma nova migração SQL para corrigir a função `handle_lead_intake`, trocando `actor_id` por `user_id`.

## Mudança
Apenas 1 linha precisa ser corrigida:

| Linha | Antes | Depois |
|-------|-------|--------|
| 57 | `actor_id` | `user_id` |

## Arquivos Afetados
- Nova migração SQL para recriar `handle_lead_intake` com a correção

## Resultado Esperado
Leads do Meta (e outras fontes) voltarão a ser criados normalmente com o histórico registrado corretamente.
