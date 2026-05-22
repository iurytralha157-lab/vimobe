## Diagnóstico encontrado

O erro continua porque a policy ativa de `INSERT` em `whatsapp_conversations` ainda valida somente o dono da sessão WhatsApp:

```sql
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM whatsapp_sessions s
    WHERE s.id = whatsapp_conversations.session_id
      AND (s.owner_user_id = auth.uid() OR is_super_admin())
  )
)
```

Isso bloqueia o caso que você descreveu: a Jéssica é membro ativo da organização e vê o lead, mas não é dona de todas as sessões/conexões WhatsApp que conversaram com esse lead. Então, ao tentar iniciar/abrir conversa usando uma sessão que não é dela, o RLS barra.

Também encontrei outro problema de visibilidade: `useAccessibleSessions` só busca sessões próprias ou grants explícitos em `whatsapp_session_access`. Como a tabela `whatsapp_session_access` está sem policies ativas, e não há grants para a Jéssica, a UI não consegue naturalmente enxergar todas as sessões relevantes por lead.

## Evidências principais

- Usuária Jéssica:
  - `user_id`: `41591176-827b-4319-ba24-d5ac4a4b3828`
  - `organization_id`: `818394bf-8c57-445e-be2f-b964c2569235`
  - `organization_members.is_active = true`

- Lead atual da rota:
  - `lead_id`: `c9126238-effd-442d-8796-1736b06cf3a3`
  - `organization_id`: `818394bf-8c57-445e-be2f-b964c2569235`
  - `assigned_user_id`: `3b27bc23-4ef6-4210-b08e-61d3e1a5c5c6`

- Existem várias conversas desse lead em sessões da mesma organização, com donos diferentes.
- A sessão da Jéssica existe, mas está `status = connecting`:
  - `session_id`: `10515505-a0d3-4aa6-8ce2-f6c7b2cbcc7d`
  - `owner_user_id`: Jéssica
- `whatsapp_session_access` não tem grants para a Jéssica.
- Não há triggers em `whatsapp_conversations`, então o erro acontece diretamente na validação RLS do `INSERT`, antes/de durante o insert, não depois de trigger.

## Plano de correção segura

1. **Corrigir a função de acesso à sessão WhatsApp**
   - Atualizar `can_access_whatsapp_session(session_id, user_id)` para permitir acesso quando:
     - usuário é `super_admin`; ou
     - usuário é dono da sessão; ou
     - usuário é membro ativo da mesma organização da sessão; ou
     - existe grant explícito em `whatsapp_session_access`.
   - Isso mantém isolamento por organização e não libera cross-organization.

2. **Corrigir a policy de INSERT de `whatsapp_conversations`**
   - Trocar a regra atual baseada apenas em `owner_user_id` por uma regra que exige:
     - usuário autenticado;
     - sessão WhatsApp pertence à mesma organização do usuário membro ativo;
     - `organization_id` enviado na conversa é igual ao `organization_id` da sessão;
     - se houver `lead_id`, o lead pertence à mesma organização.
   - Não usar `WITH CHECK (true)`.
   - Não liberar público.

3. **Corrigir SELECT/UPDATE/DELETE mantendo segurança**
   - Garantir que `can_view_whatsapp_conversation(id)` continue permitindo leitura apenas para membros ativos da organização da conversa.
   - Para histórico de mensagens (`whatsapp_messages`), manter a regra via `can_view_whatsapp_conversation(conversation_id)`.

4. **Corrigir o frontend do insert se necessário**
   - Em `src/hooks/use-start-conversation.ts`, antes do insert, buscar a sessão selecionada e usar `session.organization_id` como fonte de verdade.
   - Montar payload com:
     - `session_id`
     - `remote_jid`
     - `contact_phone`
     - `contact_name`
     - `lead_id`
     - `unread_count`
     - `is_group`
     - `organization_id` igual ao da sessão
   - Isso evita divergência entre `organization.id` do contexto e organização real da sessão.

5. **Ajustar fallback de abertura por lead**
   - Em `FloatingChat`, priorizar abrir conversa existente por `lead_id` antes de tentar criar uma nova conversa.
   - Assim, se já existe histórico para aquele lead em outra sessão da mesma organização, a Jéssica abre o histórico em vez de tentar criar duplicado desnecessário.

6. **Validação esperada**
   - Jéssica consegue ver histórico do lead `c9126238-effd-442d-8796-1736b06cf3a3` em conversas de outras sessões da mesma organização.
   - Jéssica consegue iniciar conversa em sessão da mesma organização quando permitido pela UI.
   - Admin da organização consegue abrir/iniciar normalmente.
   - Usuário de outra organização não vê nem insere conversas da organização `818394bf-8c57-445e-be2f-b964c2569235`.

## SQL final que pretendo aplicar

```sql
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_session(
  p_session_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_sessions s
    WHERE s.id = p_session_id
      AND (
        public.is_super_admin()
        OR s.owner_user_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.organization_members om
          WHERE om.user_id = p_user_id
            AND om.organization_id = s.organization_id
            AND om.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.whatsapp_session_access wsa
          WHERE wsa.session_id = s.id
            AND wsa.user_id = p_user_id
            AND wsa.can_view = true
        )
      )
  );
$$;

DROP POLICY IF EXISTS conversations_insert ON public.whatsapp_conversations;
CREATE POLICY conversations_insert
ON public.whatsapp_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.whatsapp_sessions s
    WHERE s.id = whatsapp_conversations.session_id
      AND whatsapp_conversations.organization_id = s.organization_id
      AND (
        public.is_super_admin()
        OR EXISTS (
          SELECT 1
          FROM public.organization_members om
          WHERE om.user_id = auth.uid()
            AND om.organization_id = s.organization_id
            AND om.is_active = true
        )
      )
      AND (
        whatsapp_conversations.lead_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.leads l
          WHERE l.id = whatsapp_conversations.lead_id
            AND l.organization_id = s.organization_id
        )
      )
  )
);
```

## Arquivos que serão alterados

- `src/hooks/use-start-conversation.ts`
  - usar `organization_id` da sessão WhatsApp como fonte de verdade no payload.
  - remover logs temporários adicionados anteriormente, se ainda estiverem no arquivo.

- `src/components/chat/FloatingChat.tsx`
  - priorizar conversa existente por `lead_id` antes de criar nova conversa.

- Banco Supabase
  - função `can_access_whatsapp_session`
  - policy `conversations_insert` em `whatsapp_conversations`