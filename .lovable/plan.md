# Corrigir privacidade do WhatsApp

## Problema

Hoje existem múltiplas policies conflitantes nas tabelas `whatsapp_sessions`, `whatsapp_conversations` e `whatsapp_messages`. Como policies PERMISSIVE são combinadas com OR, qualquer policy antiga liberando acesso por organização sobrescreve as novas restrições. Resultado atual: ninguém está vendo nada porque algumas dependências (ex: `organization_members`) podem estar vazias, e a lógica ficou contraditória.

Policies problemáticas detectadas:
- `whatsapp_sessions`: "Users can view their own sessions", "Users can update/delete their own sessions", "whatsapp_sessions_policy" (todas redundantes/conflitantes com `sessions_select`)
- `whatsapp_conversations`: "whatsapp_conversations_policy" (ALL, baseado em organização)
- `whatsapp_messages`: "Users can view their own messages", "whatsapp_messages_policy" (ALL)

## Regra desejada (simplificada)

- **Cada usuário vê apenas as instâncias (`whatsapp_sessions`) que ele criou** (`owner_user_id = auth.uid()`)
- **Conversas e mensagens**: visíveis apenas se pertencem a uma instância do próprio usuário
- **Super Admin**: continua vendo tudo (manutenção)
- Acesso compartilhado via `whatsapp_session_access` fica desabilitado por ora (conforme "por ora vamos deixar assim")

## Migração SQL

```sql
-- whatsapp_sessions: limpar e recriar
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Users can create sessions in their org" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Session owners and admins can update" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Session owners and admins can delete" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS whatsapp_sessions_policy ON public.whatsapp_sessions;
DROP POLICY IF EXISTS sessions_select ON public.whatsapp_sessions;

CREATE POLICY sessions_select_own ON public.whatsapp_sessions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR owner_user_id = auth.uid());

CREATE POLICY sessions_insert_own ON public.whatsapp_sessions
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() AND organization_id = get_user_organization_id());

CREATE POLICY sessions_update_own ON public.whatsapp_sessions
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR owner_user_id = auth.uid());

CREATE POLICY sessions_delete_own ON public.whatsapp_sessions
  FOR DELETE TO authenticated
  USING (is_super_admin() OR owner_user_id = auth.uid());

-- whatsapp_conversations: limpar policy antiga por organização
DROP POLICY IF EXISTS whatsapp_conversations_policy ON public.whatsapp_conversations;
-- mantém conversations_select/update/delete que já usam can_view_whatsapp_conversation

-- whatsapp_messages: limpar policies redundantes
DROP POLICY IF EXISTS "Users can view their own messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_policy ON public.whatsapp_messages;
-- mantém messages_select/insert/update que usam can_view_whatsapp_conversation

-- Atualizar a função central para refletir "somente owner"
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_session(p_session_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_sessions
    WHERE id = p_session_id
      AND (owner_user_id = p_user_id OR is_super_admin())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_whatsapp_conversation(p_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c
    JOIN public.whatsapp_sessions s ON s.id = c.session_id
    WHERE c.id = p_conversation_id
      AND (s.owner_user_id = auth.uid() OR is_super_admin())
  );
$$;
```

## Frontend

Nenhuma mudança necessária — `useAccessibleSessions` já filtra por `owner_user_id` e o restante usa as policies do banco.

## Validação

1. Login com usuário comum → vê apenas instâncias onde é `owner_user_id`
2. Conversas e mensagens dessas instâncias aparecem normalmente
3. Outro usuário da mesma organização não vê as instâncias alheias
4. Super Admin segue vendo tudo
