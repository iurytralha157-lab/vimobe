
# Plano: Corrigir Som e Texto das Notificações de Leads

## Problemas Identificados

### 1. Notificação mostra "Atribuído para: Não atribuído" 
**Causa**: O trigger `notify_new_lead` é executado no momento do INSERT, quando `assigned_user_id` ainda é NULL. O round-robin (`trigger_lead_intake`) só atribui o usuário **depois** via UPDATE separado.

**Evidência**: Os leads Apollo, tadeu, Miguel estão corretamente atribuídos a André Rocha e Jhennifer no banco, mas as notificações mostram "Não atribuído".

### 2. Som das notificações não está tocando
**Causa provável**: O canal realtime pode não estar conectando corretamente, ou há um problema de timing no unlock do áudio.

---

## Solução

### Correção 1: Mover notificação para APÓS o round-robin

Criar uma nova lógica para notificar admins **depois** que o lead já foi atribuído:

**Opção A (Recomendada)**: Criar um trigger adicional no UPDATE que notifica os admins quando `assigned_user_id` muda de NULL para um valor (primeira atribuição).

**SQL a ser executado:**

```sql
-- 1. Modificar notify_new_lead para notificar APENAS o usuário atribuído
-- (não os admins, pois ainda não sabemos quem será atribuído)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_pipeline_name TEXT;
  v_source_label TEXT;
BEGIN
  -- Get pipeline name
  SELECT name INTO v_pipeline_name FROM public.pipelines WHERE id = NEW.pipeline_id;
  
  -- Translate source
  v_source_label := CASE NEW.source
    WHEN 'whatsapp' THEN 'WhatsApp'
    WHEN 'facebook' THEN 'Facebook Ads'
    WHEN 'instagram' THEN 'Instagram Ads'
    WHEN 'website' THEN 'Website'
    WHEN 'manual' THEN 'Manual'
    WHEN 'meta_ads' THEN 'Meta Ads'
    WHEN 'wordpress' THEN 'WordPress'
    ELSE COALESCE(NEW.source, 'Não informada')
  END;
  
  -- Só notificar o assigned_user se já existir (leads manuais com atribuição direta)
  IF NEW.assigned_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.assigned_user_id,
      NEW.organization_id,
      '🆕 Novo lead recebido!',
      'Lead "' || NEW.name || '" atribuído a você. Origem: ' || v_source_label || '. Pipeline: ' || COALESCE(v_pipeline_name, 'Padrão') || '.',
      'lead',
      NEW.id
    );
  END IF;
  
  -- Admins serão notificados pelo trigger de primeira atribuição
  RETURN NEW;
END;
$$;

-- 2. Criar trigger para notificar quando lead recebe primeira atribuição
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
  -- Só dispara se assigned_user_id mudou de NULL para um valor
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
    
    -- 2. Notificar todos os admins
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
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Criar o trigger
DROP TRIGGER IF EXISTS trigger_notify_lead_first_assignment ON public.leads;
CREATE TRIGGER trigger_notify_lead_first_assignment
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_first_assignment();
```

### Correção 2: Melhorar robustez do som

No hook `use-notifications.ts`:
1. Adicionar logs mais detalhados
2. Garantir que o som seja tocado mesmo se o unlock não funcionou perfeitamente
3. Usar try/catch mais robusto

**Mudanças no arquivo `src/hooks/use-notifications.ts`:**

```typescript
// Dentro do callback do realtime, melhorar a lógica de play:
if (newNotification.type === 'lead') {
  console.log('🔔 Attempting to play new-lead sound...');
  
  const playSound = async () => {
    try {
      if (newLeadSoundRef.current) {
        // Reset and set volume
        newLeadSoundRef.current.currentTime = 0;
        newLeadSoundRef.current.volume = 0.7;
        
        // Try to play
        await newLeadSoundRef.current.play();
        console.log('✅ New lead sound played successfully');
      }
    } catch (err) {
      console.warn('⚠️ Could not play sound (user interaction may be required):', err);
      // Fallback: create a new Audio instance and try
      try {
        const fallbackAudio = new Audio('/sounds/new-lead.mp3');
        fallbackAudio.volume = 0.7;
        await fallbackAudio.play();
        console.log('✅ Fallback sound played successfully');
      } catch (fallbackErr) {
        console.error('❌ Fallback sound also failed:', fallbackErr);
      }
    }
  };
  
  playSound();
  
  // ... rest of notification handling
}
```

---

## Resultado Esperado

**Antes:**
- Notificação: "Lead Miguel | Atribuído para: Não atribuído"
- Som: Não toca

**Depois:**
- Notificação: "Lead Miguel | Atribuído para: Jhennifer"  
- Som: Toca quando a notificação chega

---

## Arquivos a Modificar

1. **Migração SQL** - Atualizar triggers de notificação
2. **src/hooks/use-notifications.ts** - Melhorar robustez do som
