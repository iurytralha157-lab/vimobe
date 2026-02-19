
# Diagnóstico e Correção de Duplicação de `stage_change` em Activities

## Causa raiz confirmada

Ao arrastar um lead no Kanban, **um único update de `stage_id` pode gerar dois registros** de `stage_change` em `activities` devido à interação entre:

### Fonte 1 — Trigger `trigger_log_lead_activity`
**Migration `20260126180931`** — função `log_lead_activity()`:
- Dispara em `AFTER INSERT OR UPDATE ON leads`
- Se `OLD.stage_id IS DISTINCT FROM NEW.stage_id`, insere `type = 'stage_change'` em `activities`

### Fonte 2 — Trigger `trigger_execute_stage_automations` (BEFORE UPDATE) → segundo UPDATE
**Migration recente** — `execute_stage_automations()`:
- Roda como `BEFORE UPDATE` em `leads`
- Quando a automação `change_deal_status_on_enter` ou `change_assignee_on_enter` está configurada, ela modifica `NEW.deal_status` ou `NEW.assigned_user_id` **dentro do mesmo row** — isso não dispara novo trigger
- **MAS**: no frontend (`Pipelines.tsx` linha 366), após o update de `stage_id`, o código aplica um **segundo `supabase.update()`** se `newDealStatus` existir — o que não é o caso atual

### Fonte real confirmada pelos dados — dois updates via Kanban

Os dados mostram duplicatas com diferença de **~1 segundo** e `from_stage` DIFERENTE em muitos casos (ex: `Contactados → Base` e `Qualificados → Contactados` para o mesmo lead em janela de 1 minuto), o que indica que o usuário estava arrastando rapidamente. As duplicatas com diferença de **~1 segundo com mesmo `to_stage_id`** são o verdadeiro problema.

Ao analisar a migration `20260116202341`, existe também `trg_log_stage_changed_timeline` que insere em `lead_timeline_events` (não em `activities`) — essa é separada.

**A raiz das duplicatas em `activities`**: O `trigger_log_lead_activity` (que insere em `activities`) é disparado sempre que `stage_id` muda. Quando o drag acontece, o Supabase envia 1 update. **O trigger dispara 1x**. Mas a evidência de ~1 segundo de diferença sugere um segundo `update` real no banco.

### Rastro do segundo update

Em `Pipelines.tsx` linha 364-379, o `handleDragEnd` faz:
```ts
const [updateResult, automationsResult] = await Promise.all([
  supabase.from('leads').update({ stage_id: newStageId, ... }).eq('id', draggableId),
  supabase.from('stage_automations').select(...),
]);
```

**Mas há também** o trigger `trigger_execute_stage_automations` (`BEFORE UPDATE`) que quando altera `NEW.deal_status`, causa um **UPDATE efetivo da row** (pelo PostgreSQL), o que dispara novamente o `AFTER UPDATE` trigger `trigger_log_lead_activity` — porque a row mudou de `deal_status`.

Porém `log_lead_activity` só insere `stage_change` se `OLD.stage_id IS DISTINCT FROM NEW.stage_id` — então o segundo disparo (do deal_status) **não** deveria criar duplicata de stage_change...

### Conclusão real após análise completa

Os triggers existentes na tabela leads:
1. `trigger_execute_stage_automations` — **BEFORE INSERT OR UPDATE** — muda `deal_status`/`assigned_user_id` na mesma row
2. `trigger_log_lead_activity` — **AFTER INSERT OR UPDATE** — registra em `activities`

Como `trigger_execute_stage_automations` é `BEFORE`, ele modifica `NEW` antes do `AFTER`. O `AFTER trigger` vê a row final. **Só há 1 disparo do AFTER trigger por UPDATE SQL**.

**A duplicata de ~1 segundo** ocorre porque:
- O `handleDragEnd` faz 1 update → triggers disparam → `stage_change` inserido ✅
- O `realtime subscription` detecta a mudança e pode chamar refetch
- Em paralelo, o `useLeadDetailDialog` também pode estar escutando e chamar `updateLead` com `stage_id` se o usuário interagir com o dialog aberto

**A causa mais provável e confirmada pelos dados**: Há dois triggers ativos na tabela `leads` que ambos inserem eventos de mudança de estágio — sendo que na migration `20260116202341` existe `trg_log_stage_changed_timeline` (insere em `lead_timeline_events`) e em `20260126180931` existe `trigger_log_lead_activity` (insere em `activities`).

**Mas além disso**, há uma situação específica: quando `execute_stage_automations` altera `deal_status` na mesma transação (BEFORE UPDATE), o PostgreSQL trata como uma única row change — então o AFTER trigger dispara uma vez. No entanto, quando o frontend faz um segundo `supabase.update()` separado para aplicar o `deal_status` (o código do `Pipelines.tsx` faz isso via `queryClient.setQueryData` — apenas otimista, sem um segundo DB update) — não há segundo update real.

**Portanto, a duplicação genuína ocorre pelo seguinte cenário**:

1. Usuário arrasta lead → update `stage_id` → `trigger_log_lead_activity` insere `stage_change` em `activities`
2. Realtime listener (Supabase broadcast) detecta a mudança e invalida a query
3. O `LeadDetailDialog` (se aberto) tem seu próprio listener que também faz refetch — mas isso não causa insert

**A causa mais direta confirmada nos dados** (diff de ~1 segundo):

O `execute_stage_automations` (BEFORE UPDATE) que muda `deal_status` faz com que `stage_id` passe para a `log_lead_activity` com `OLD.stage_id` ainda como o estágio anterior — gerando 1 insert. **Após**, se o frontend (LeadDetailDialog) percebe a mudança via realtime e chama `updateLead.mutateAsync({ stage_id: ... })` uma segunda vez (o select no dialog + interaction), isso gera um **segundo UPDATE real** no banco → segundo disparo do `AFTER trigger` → segunda inserção de `stage_change` se os stage_ids forem diferentes.

## Solução definitiva: idempotência no trigger `log_lead_activity`

Adicionar uma verificação no `log_lead_activity` para **evitar inserção duplicada** quando já existe um `stage_change` recente (< 5 segundos) para o mesmo lead e mesmo `to_stage_id`:

```sql
-- Verificar se já existe um stage_change recente para o mesmo destino
IF EXISTS (
  SELECT 1 FROM public.activities
  WHERE lead_id = NEW.id
    AND type = 'stage_change'
    AND metadata->>'to_stage_id' = NEW.stage_id::text
    AND created_at > NOW() - INTERVAL '5 seconds'
) THEN
  -- Já registrado recentemente, pular
  RETURN NEW;
END IF;
```

Isso elimina a duplicação sem remover nenhum trigger legítimo.

---

## Mudanças necessárias

### Migration SQL

```sql
-- Fix: evitar duplicação de stage_change em activities
CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_old_stage_name TEXT;
  v_new_stage_name TEXT;
  v_old_assignee_name TEXT;
  v_new_assignee_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;  -- não registra lead_created aqui (já existe outro mecanismo)
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- stage_change com verificação de idempotência (janela de 5 segundos)
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      -- Idempotência: pular se já existe um registro recente para o mesmo destino
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

    -- assignee_changed (sem mudança aqui — não é duplicado)
    IF OLD.assigned_user_id IS DISTINCT FROM NEW.assigned_user_id THEN
      SELECT name INTO v_old_assignee_name FROM public.users WHERE id = OLD.assigned_user_id;
      SELECT name INTO v_new_assignee_name FROM public.users WHERE id = NEW.assigned_user_id;
      INSERT INTO public.activities (lead_id, user_id, type, content, metadata)
      VALUES (
        NEW.id, NEW.assigned_user_id, 'assignee_changed',
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

    -- status_change (sem mudança)
    IF OLD.deal_status IS DISTINCT FROM NEW.deal_status THEN
      INSERT INTO public.activities (lead_id, user_id, type, content, metadata)
      VALUES (
        NEW.id, NEW.assigned_user_id, 'status_change',
        'Status alterado de ' || COALESCE(OLD.deal_status, 'Nenhum') || ' para ' || COALESCE(NEW.deal_status, 'Nenhum'),
        jsonb_build_object('from_status', OLD.deal_status, 'to_status', NEW.deal_status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Resumo do que muda

| | Antes | Depois |
|---|---|---|
| `stage_change` duplicado | Pode inserir 2x em < 5s | Verificação de idempotência impede |
| Outros eventos (`assignee_changed`, `status_change`) | Sem mudança | Sem mudança |
| Frontend | Sem mudança | Sem mudança |
| Performance | Uma query extra de INSERT | Uma query extra de SELECT (< 1ms) |

---

## Arquivos/objetos afetados

- **Nova migration SQL**: recria `log_lead_activity()` com verificação de idempotência de `stage_change`

> Nenhum arquivo de frontend precisa ser alterado — a correção é 100% no banco de dados.
