
# Plano: Notificar Líderes de Equipe sobre Novos Leads

## Objetivo
Quando um lead chega em uma pipeline que está vinculada a uma ou mais equipes, os **líderes** dessas equipes devem receber uma notificação, assim como os administradores já recebem hoje.

---

## Arquitetura Atual

O sistema possui dois triggers de notificação:

| Trigger | Quando dispara | Quem notifica |
|---------|----------------|---------------|
| `notify_new_lead()` | INSERT de lead (se já tem assigned_user) | Usuário atribuído |
| `notify_lead_first_assignment()` | UPDATE quando assigned_user muda de NULL para valor | Usuário atribuído + Todos os Admins |

---

## Estrutura de Dados Relevante

```text
team_pipelines
+-------------+-------------+
| team_id     | pipeline_id |
+-------------+-------------+

team_members
+---------+-----------+
| user_id | is_leader |
+---------+-----------+
```

### Lógica para Encontrar Líderes

```sql
SELECT tm.user_id
FROM team_pipelines tp
JOIN team_members tm ON tm.team_id = tp.team_id
WHERE tp.pipeline_id = NEW.pipeline_id
  AND tm.is_leader = true;
```

---

## Mudanças Necessárias

### 1. Modificar `notify_lead_first_assignment()`

Atualizar a função para, após notificar admins, também notificar os líderes de equipe cujas equipes estão vinculadas à pipeline do lead.

**Lógica a adicionar:**

```sql
-- 3. Notificar líderes de equipes vinculadas à pipeline
FOR v_user IN 
  SELECT DISTINCT tm.user_id 
  FROM team_pipelines tp
  JOIN team_members tm ON tm.team_id = tp.team_id
  WHERE tp.pipeline_id = NEW.pipeline_id
    AND tm.is_leader = true
    AND tm.user_id NOT IN (SELECT unnest(v_notified_users))
LOOP
  PERFORM public.create_notification(
    v_user.user_id,
    NEW.organization_id,
    '🆕 Novo lead na sua equipe!',
    'Lead "' || NEW.name || '" | Origem: ' || v_source_label || 
    ' | Atribuído para: ' || COALESCE(v_assigned_user_name, 'Não atribuído') || 
    ' | Pipeline: ' || COALESCE(v_pipeline_name, 'Padrão') || '.',
    'lead',
    NEW.id
  );
  v_notified_users := array_append(v_notified_users, v_user.user_id);
END LOOP;
```

---

## Ordem de Notificação

1. **Usuário atribuído** - recebe a notificação de que o lead foi atribuído a ele
2. **Admins da organização** - recebem notificação geral (exceto se já notificados)
3. **Líderes de equipes vinculadas à pipeline** - recebem notificação como supervisores (exceto se já notificados como admin ou assigned_user)

---

## Prevenção de Duplicatas

O array `v_notified_users` é usado para rastrear quem já foi notificado. Cada etapa adiciona os IDs ao array e as etapas seguintes filtram para não notificar a mesma pessoa duas vezes.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Nova migração SQL | Atualizar função `notify_lead_first_assignment()` para incluir líderes de equipe |

---

## SQL da Migração

```sql
CREATE OR REPLACE FUNCTION public.notify_lead_first_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user RECORD;
  v_notified_users UUID[] := ARRAY[]::UUID[];
  v_pipeline_name TEXT;
  v_source_label TEXT;
  v_assigned_user_name TEXT;
BEGIN
  -- Só dispara se assigned_user_id mudou de NULL para um valor (primeira atribuição)
  IF OLD.assigned_user_id IS NULL AND NEW.assigned_user_id IS NOT NULL THEN
    -- Get pipeline name
    SELECT name INTO v_pipeline_name FROM public.pipelines WHERE id = NEW.pipeline_id;
    SELECT name INTO v_assigned_user_name FROM public.users WHERE id = NEW.assigned_user_id;
    
    -- Translate source
    v_source_label := CASE NEW.source
      WHEN 'whatsapp' THEN 'WhatsApp'
      WHEN 'webhook' THEN 'Webhook'
      WHEN 'facebook' THEN 'Facebook Ads'
      WHEN 'instagram' THEN 'Instagram Ads'
      WHEN 'website' THEN 'Website'
      WHEN 'manual' THEN 'Manual'
      WHEN 'meta_ads' THEN 'Meta Ads'
      WHEN 'wordpress' THEN 'WordPress'
      ELSE COALESCE(NEW.source, 'Não informada')
    END;
    
    -- 1. Notificar o usuário atribuído
    PERFORM public.create_notification(
      NEW.assigned_user_id,
      NEW.organization_id,
      '🆕 Novo lead recebido!',
      'Lead "' || NEW.name || '" atribuído a você. Origem: ' || v_source_label || '. Pipeline: ' || COALESCE(v_pipeline_name, 'Padrão') || '.',
      'lead',
      NEW.id
    );
    v_notified_users := array_append(v_notified_users, NEW.assigned_user_id);
    
    -- 2. Notificar todos os admins (exceto já notificados)
    FOR v_user IN 
      SELECT id FROM public.users 
      WHERE organization_id = NEW.organization_id 
      AND role = 'admin'
      AND NOT (id = ANY(v_notified_users))
    LOOP
      PERFORM public.create_notification(
        v_user.id,
        NEW.organization_id,
        '🆕 Novo lead no CRM!',
        'Lead "' || NEW.name || '" | Origem: ' || v_source_label || ' | Atribuído para: ' || COALESCE(v_assigned_user_name, 'Não atribuído') || ' | Pipeline: ' || COALESCE(v_pipeline_name, 'Padrão') || '.',
        'lead',
        NEW.id
      );
      v_notified_users := array_append(v_notified_users, v_user.id);
    END LOOP;
    
    -- 3. Notificar líderes de equipes vinculadas à pipeline do lead
    FOR v_user IN 
      SELECT DISTINCT tm.user_id 
      FROM public.team_pipelines tp
      JOIN public.team_members tm ON tm.team_id = tp.team_id
      WHERE tp.pipeline_id = NEW.pipeline_id
        AND tm.is_leader = true
        AND NOT (tm.user_id = ANY(v_notified_users))
    LOOP
      PERFORM public.create_notification(
        v_user.user_id,
        NEW.organization_id,
        '🆕 Novo lead na sua equipe!',
        'Lead "' || NEW.name || '" | Origem: ' || v_source_label || ' | Atribuído para: ' || COALESCE(v_assigned_user_name, 'Não atribuído') || ' | Pipeline: ' || COALESCE(v_pipeline_name, 'Padrão') || '.',
        'lead',
        NEW.id
      );
      v_notified_users := array_append(v_notified_users, v_user.user_id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;
```

---

## Fluxo Visual

```text
Lead chega (via webhook, manual, etc.)
         │
         ▼
    ┌───────────────────┐
    │ trigger_lead_intake│ (atribui via round-robin)
    └─────────┬─────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ notify_lead_first_assignment │
    └─────────────────────────────┘
              │
    ┌─────────┼─────────┬────────────────────┐
    ▼         ▼         ▼                    ▼
 Assigned   Admins   Líderes de equipe    (outros)
   User              (da pipeline)
```

---

## Observações Técnicas

1. **Performance**: A query para encontrar líderes é eficiente (usa JOINs em tabelas pequenas)

2. **Sem duplicatas**: O array `v_notified_users` garante que ninguém recebe duas notificações para o mesmo lead

3. **Compatibilidade**: Líderes que também são admins não receberão duplicatas - serão notificados como admin (etapa 2) e filtrados na etapa 3

4. **Mensagem diferenciada**: Líderes recebem "Novo lead na sua equipe!" enquanto admins recebem "Novo lead no CRM!" para diferenciação

5. **Pipeline sem equipe**: Se a pipeline não estiver vinculada a nenhuma equipe, nenhum líder adicional é notificado (comportamento atual mantido)
