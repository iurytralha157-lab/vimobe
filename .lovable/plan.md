

# Fix: Session Owners Can't See Conversations or Send Messages

## Problem

The `can_access_whatsapp_session()` SECURITY DEFINER function checks:
1. Super admin → yes
2. Same org + admin → yes
3. Has row in `whatsapp_session_access` → yes

It **never checks if the user is the session owner** (`owner_user_id`). Jessica owns the session but has no row in `whatsapp_session_access`, so the function returns `false`. This blocks her from seeing conversations, messages, and sending messages (the "Sessão não encontrada" error).

## Fix

Single migration to update the `can_access_whatsapp_session` function to also check ownership:

```sql
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_session(p_session_id uuid, p_user_id uuid DEFAULT auth.uid())
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_session record;
  v_user_org_id uuid;
BEGIN
  IF public.is_super_admin() THEN RETURN TRUE; END IF;
  
  SELECT ws.organization_id, ws.owner_user_id INTO v_session
  FROM public.whatsapp_sessions ws WHERE ws.id = p_session_id;
  
  IF v_session IS NULL THEN RETURN FALSE; END IF;
  
  -- Owner always has access
  IF v_session.owner_user_id = p_user_id THEN RETURN TRUE; END IF;
  
  SELECT u.organization_id INTO v_user_org_id
  FROM public.users u WHERE u.id = p_user_id;
  
  IF v_user_org_id != v_session.organization_id THEN RETURN FALSE; END IF;
  
  IF public.is_admin() THEN RETURN TRUE; END IF;
  
  -- Check explicit access grants
  RETURN EXISTS (
    SELECT 1 FROM public.whatsapp_session_access wsa
    WHERE wsa.session_id = p_session_id AND wsa.user_id = p_user_id
  );
END;
$$;
```

This adds the ownership check (`owner_user_id = p_user_id`) before the org/admin checks, so session owners immediately get access to their own conversations and messages without needing an explicit grant.

### No frontend changes needed
The RLS policies already use `can_access_whatsapp_session(session_id)` for conversations and messages. Fixing the function fixes everything downstream.

