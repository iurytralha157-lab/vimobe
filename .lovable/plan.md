## Diagnóstico

O erro acontece no `POST /rest/v1/whatsapp_conversations` ao iniciar conversa para o lead.

Pelo request capturado:

```text
user/auth.uid(): 41591176-827b-4319-ba24-d5ac4a4b3828
session_id: 10515505-a0d3-4aa6-8ce2-f6c7b2cbcc7d
organization_id: 818394bf-8c57-445e-be2f-b964c2569235
```

A sessão WhatsApp existe, está conectada, pertence à mesma organização e o `owner_user_id` é exatamente o usuário logado:

```text
owner_user_id = 41591176-827b-4319-ba24-d5ac4a4b3828
```

Então o problema não é o frontend mandando sessão errada. O problema está nas policies/funções RLS atuais.

## Causa raiz

A policy de `INSERT` em `whatsapp_conversations` já valida o dono da sessão, mas o `.insert(...).select(...).single()` precisa conseguir retornar a conversa criada logo depois do INSERT.

Para retornar essa linha, o Supabase aplica também a policy de `SELECT`:

```sql
conversations_select USING (can_view_whatsapp_conversation(id))
```

A função atual `public.can_view_whatsapp_conversation(uuid)` ainda valida acesso por `organization_members`, mas este projeto usa `users.organization_id` como fonte da organização ativa. Usuários padrão podem não existir em `organization_members`, então a linha recém-criada não fica visível para o próprio dono da conexão e o Supabase retorna:

```text
new row violates row-level security policy for table "whatsapp_conversations"
```

Também encontrei uma inconsistência relacionada: a policy atual de `whatsapp_sessions` ainda tem `sessions_select_org` usando `organization_members`, o que contradiz a regra anterior de isolamento por dono da conexão.

## Plano de correção

1. Criar uma migration nova para alinhar as funções/policies WhatsApp ao modelo real do sistema.

2. Atualizar `public.can_view_whatsapp_conversation(p_conversation_id uuid)` para permitir acesso quando:
   - o usuário é `super_admin`; ou
   - a conversa pertence a uma sessão cujo `owner_user_id = auth.uid()`; ou
   - se o compartilhamento de sessão ainda for permitido no produto, o usuário tem registro em `whatsapp_session_access` com `can_view` ou `can_send`.

3. Garantir que a função use:

```sql
SECURITY DEFINER
SET search_path = public
```

para evitar problemas de RLS recursivo e seguir o padrão de segurança do projeto.

4. Recriar a policy de `INSERT` em `whatsapp_conversations` com nome único e removendo possíveis policies antigas conflitantes:
   - validar `session_id` existente;
   - validar `s.organization_id = whatsapp_conversations.organization_id`;
   - validar `s.owner_user_id = auth.uid()` ou grant explícito `can_send`, se compartilhamento for mantido.

5. Ajustar as policies de `SELECT`, `UPDATE` e `DELETE` de `whatsapp_conversations` para usarem a função corrigida.

6. Ajustar as policies de `whatsapp_sessions` para remover o vazamento por `organization_members` e manter acesso por dono:

```sql
owner_user_id = auth.uid()
```

com exceção apenas para `super_admin`, se essa exceção continuar desejada.

7. Opcionalmente ajustar o frontend em `src/hooks/use-start-conversation.ts` para trocar `.single()` por `.maybeSingle()` apenas se ainda houver risco de retorno vazio por RLS; a correção principal deve ficar no banco.

## Como validar depois

1. Logar com o usuário padrão `Jessica`.
2. Usar uma sessão cujo `owner_user_id` seja o próprio usuário.
3. Iniciar conversa com um lead.
4. Confirmar que o INSERT em `whatsapp_conversations` retorna `201/200` e a conversa abre.
5. Logar com outro usuário da mesma organização.
6. Confirmar que ele não vê nem usa a sessão/conversa da Jessica, salvo se houver regra explícita de compartilhamento ativa.