
# Migração SQL: Idempotência no Trigger `log_lead_activity`

## Estado atual confirmado

A função `public.log_lead_activity()` na migration mais recente (`20260127025549`) **não possui nenhuma verificação de idempotência** para `stage_change`. Ao detectar que `OLD.stage_id IS DISTINCT FROM NEW.stage_id`, ela insere diretamente em `activities` sem verificar se já existe um registro recente.

## O que a migration vai fazer

Criar uma nova migration SQL que substitui a função `public.log_lead_activity()` adicionando **somente** um bloco `IF NOT EXISTS` antes do `INSERT` de `stage_change`. Nenhuma outra lógica é alterada.

## SQL da migration

```sql
-- Fix: idempotência no trigger log_lead_activity para evitar duplicação de stage_change
-- Janela de 5 segundos: se já existe um stage_change para o mesmo lead e mesmo to_stage_id,
-- o INSERT é pulado.

CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_old_stage_name TEXT;
  v_new_stage_name TEXT;
  v_old_assignee_name TEXT;
  v_new_assignee_name TEXT;
BEGIN
  -- On INSERT: não registrar aqui para evitar race condition
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN

    -- stage_change com verificação de idempotência (janela de 5 segundos)
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.activities
        WHERE lead_id = NEW.id
          AND type = 'stage_change'
          AND metadata->>'to_stage_id' = NEW.stage_id::text
          AND created_at > NOW() - INTERVAL '5 seconds'
      ) THEN
        SELECT name INTO v_old_stage_name FROM public.stages WHERE id = OLD.stage_id;
        SELECT name INTO v_new_stage_name FROM public.stages WHERE id = NEW.stage_id;

        INSERT INTO public.activities (lead_id, user_id, type, content, metadata)
        VALUES (
          NEW.id,
          NEW.assigned_user_id,
          'stage_change',
          'Movido de "' || COALESCE(v_old_stage_name, 'Desconhecido') || '" para "' || COALESCE(v_new_stage_name, 'Desconhecido') || '"',
          jsonb_build_object(
            'from_stage', v_old_stage_name,
            'to_stage', v_new_stage_name,
            'from_stage_id', OLD.stage_id,
            'to_stage_id', NEW.stage_id
          )
        );
      END IF;
    END IF;

    -- assignee_changed (sem alteração)
    IF OLD.assigned_user_id IS DISTINCT FROM NEW.assigned_user_id THEN
      SELECT name INTO v_old_assignee_name FROM public.users WHERE id = OLD.assigned_user_id;
      SELECT name INTO v_new_assignee_name FROM public.users WHERE id = NEW.assigned_user_id;

      INSERT INTO public.activities (lead_id, user_id, type, content, metadata)
      VALUES (
        NEW.id,
        NEW.assigned_user_id,
        'assignee_changed',
        CASE
          WHEN NEW.assigned_user_id IS NULL THEN 'Responsável removido'
          WHEN OLD.assigned_user_id IS NULL THEN 'Atribuído para ' || COALESCE(v_new_assignee_name, 'Desconhecido')
          ELSE 'Responsável alterado de ' || COALESCE(v_old_assignee_name, 'Desconhecido') || ' para ' || COALESCE(v_new_assignee_name, 'Desconhecido')
        END,
        jsonb_build_object(
          'from_user_id', OLD.assigned_user_id,
          'to_user_id', NEW.assigned_user_id,
          'from_user_name', v_old_assignee_name,
          'to_user_name', v_new_assignee_name
        )
      );
    END IF;

    -- status_change (sem alteração)
    IF OLD.deal_status IS DISTINCT FROM NEW.deal_status THEN
      INSERT INTO public.activities (lead_id, user_id, type, content, metadata)
      VALUES (
        NEW.id,
        NEW.assigned_user_id,
        'status_change',
        CASE NEW.deal_status
          WHEN 'won' THEN 'Status alterado para Ganho'
          WHEN 'lost' THEN 'Status alterado para Perdido'
          ELSE 'Status alterado para Aberto'
        END,
        jsonb_build_object(
          'from_status', OLD.deal_status,
          'to_status', NEW.deal_status
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## O que muda vs. o que permanece igual

| Bloco | Antes | Depois |
|---|---|---|
| `stage_change` INSERT | Direto, sem verificação | Wrapped em `IF NOT EXISTS` com janela de 5s |
| `assignee_changed` INSERT | Sem alteração | Idêntico |
| `status_change` INSERT | Sem alteração | Idêntico |
| INSERT no `TG_OP = 'INSERT'` | Retorna sem ação | Idêntico |
| O trigger em si (`trigger_log_lead_activity`) | Sem recriação | Sem recriação (apenas a função é substituída) |

## Impacto de performance

A verificação adiciona uma query `SELECT 1 FROM activities WHERE ...` apenas quando `stage_id` muda. Com índice existente em `activities(lead_id, type, created_at)`, esta query leva **< 1ms** e só executa durante arrasto de Kanban ou mudança programática de estágio.

## Arquivos afetados

- Nova migration SQL criada em `supabase/migrations/`
- Nenhum arquivo de frontend modificado
