-- =========================================================
-- WhatsApp privacy: cada usuário vê SOMENTE suas próprias
-- instâncias, conversas e mensagens. Super admin vê tudo.
-- =========================================================

-- ---------- whatsapp_sessions ----------
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can create sessions in their org" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Session owners and admins can update" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Session owners and admins can delete" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS whatsapp_sessions_policy ON public.whatsapp_sessions;
DROP POLICY IF EXISTS sessions_select ON public.whatsapp_sessions;
DROP POLICY IF EXISTS sessions_select_own ON public.whatsapp_sessions;
DROP POLICY IF EXISTS sessions_insert_own ON public.whatsapp_sessions;
DROP POLICY IF EXISTS sessions_update_own ON public.whatsapp_sessions;
DROP POLICY IF EXISTS sessions_delete_own ON public.whatsapp_sessions;

CREATE POLICY sessions_select_own ON public.whatsapp_sessions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR owner_user_id = auth.uid());

CREATE POLICY sessions_insert_own ON public.whatsapp_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY sessions_update_own ON public.whatsapp_sessions
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR owner_user_id = auth.uid());

CREATE POLICY sessions_delete_own ON public.whatsapp_sessions
  FOR DELETE TO authenticated
  USING (is_super_admin() OR owner_user_id = auth.uid());

-- ---------- whatsapp_conversations ----------
DROP POLICY IF EXISTS whatsapp_conversations_policy ON public.whatsapp_conversations;

-- ---------- whatsapp_messages ----------
DROP POLICY IF EXISTS "Users can view their own messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_policy ON public.whatsapp_messages;

-- ---------- funções auxiliares (somente owner + super admin) ----------
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_session(p_session_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_sessions
    WHERE id = p_session_id
      AND (owner_user_id = p_user_id OR public.is_super_admin())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_whatsapp_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_conversations c
    JOIN public.whatsapp_sessions s ON s.id = c.session_id
    WHERE c.id = p_conversation_id
      AND (s.owner_user_id = auth.uid() OR public.is_super_admin())
  );
$$;
