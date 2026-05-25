# Plano de Correção: Isolamento WhatsApp por Usuário

## Problema Detectado
O erro `new row violates row-level security policy for table "whatsapp_conversations"` ocorria porque as políticas de RLS e as funções de verificação de acesso ainda tinham dependências residuais da tabela `organization_members` ou falhavam ao validar o acesso durante a operação combinada de INSERT + SELECT que o Supabase realiza.

## Ações Realizadas
1.  **Função de Acesso Robusta**: Recriada a função `public.can_view_whatsapp_conversation` como `SECURITY DEFINER`. Isso garante que a verificação de acesso ignore as políticas de RLS das tabelas internas (`whatsapp_sessions`) durante a execução, evitando loops ou falhas de permissão ocultas.
2.  **Isolamento por Dono/Sessão**: As políticas de INSERT em `whatsapp_conversations` agora validam apenas se o usuário é o dono da sessão (`owner_user_id`) ou se possui acesso compartilhado via `whatsapp_session_access`.
3.  **Correção em Organizations**: Atualizada a política de visualização da tabela `organizations` para usar `users.organization_id` em vez de `organization_members`, garantindo que o usuário consiga "ver" sua própria organização ao realizar operações vinculadas a ela.
4.  **Propagação para Mensagens**: As políticas de `whatsapp_messages` foram alinhadas com as de conversas para garantir consistência total no fluxo de chat.

## Arquivos Alterados
- `migrations/final_fix_whatsapp_isolation.sql` (Nova migration consolidada)
- `src/hooks/use-start-conversation.ts` (Já revisado anteriormente, mantido robusto)

## Como Validar
1.  Aplicar o SQL da migration `migrations/final_fix_whatsapp_isolation.sql` no Editor SQL do Supabase.
2.  Tentar iniciar uma conversa com um Lead usando uma sessão que pertença ao usuário logado.
3.  Verificar se a conversa é criada com sucesso sem erros de RLS.
