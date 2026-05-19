## Problema

O erro `column "owner_user_id" does not exist` ocorre porque `owner_user_id` pertence à tabela `whatsapp_sessions`, e não a `whatsapp_conversations`. A policy estava referenciando a coluna na tabela errada.

## SQL corrigido

```sql
-- 1) Adiciona coluna "Apenas Leads" no acesso compartilhado
ALTER TABLE public.whatsapp_session_access
  ADD COLUMN IF NOT EXISTS only_leads_access boolean NOT NULL DEFAULT false;

-- 2) Remove policy antiga (se existir) antes de recriar
DROP POLICY IF EXISTS conversations_privacy_policy ON public.whatsapp_conversations;

-- 3) Nova policy de SELECT em whatsapp_conversations
CREATE POLICY conversations_privacy_policy
ON public.whatsapp_conversations
FOR SELECT
USING (
  -- Super admin vê tudo
  public.is_super_admin()
  OR
  -- Dono da sessão vê tudo da própria sessão
  EXISTS (
    SELECT 1 FROM public.whatsapp_sessions s
    WHERE s.id = whatsapp_conversations.session_id
      AND s.owner_user_id = auth.uid()
  )
  OR
  -- Usuário com acesso compartilhado:
  --   - se only_leads_access = false → vê todas as conversas da sessão
  --   - se only_leads_access = true  → vê apenas conversas com lead_id preenchido
  EXISTS (
    SELECT 1 FROM public.whatsapp_session_access wsa
    WHERE wsa.session_id = whatsapp_conversations.session_id
      AND wsa.user_id = auth.uid()
      AND (wsa.only_leads_access = false OR whatsapp_conversations.lead_id IS NOT NULL)
  )
);
```

## Próximos passos

Aplicar esse SQL via migration (ao aprovar o plano) e em seguida espelhar a mesma regra na policy de SELECT de `whatsapp_messages` (filtrando pelo `conversation_id` correspondente) para garantir que o "Apenas Leads" também esconda o histórico de mensagens das conversas não-lead.