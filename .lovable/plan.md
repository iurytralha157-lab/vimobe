
Objetivo: corrigir o fluxo de “clicar no WhatsApp no lead/pipeline” para sempre abrir uma conversa enviável com sessão válida, e eliminar o erro SQL `42703 column t.leader_id does not exist`.

Do I know what the issue is? Sim.

Diagnóstico consolidado (o que está acontecendo)
1) Erro SQL no banco:
- As políticas RLS de `whatsapp_conversations`/`whatsapp_messages` chamam `can_access_lead(...)`.
- A função `can_access_lead` hoje referencia `teams.leader_id`, mas essa coluna não existe mais (modelo atual usa `team_members.is_leader`).
- Resultado: várias queries do WhatsApp estouram 400 com `42703`.

2) Conversa abre sem sessão enviável:
- No fluxo do botão WhatsApp (Pipeline/LeadCard), o `useFindConversationByPhone` prioriza conversa por `lead_id` sem restringir pela sessão escolhida.
- Assim, pode abrir conversa de outra instância/sessão (que a usuária não gerencia), vindo com `session: null` no join.
- Ao enviar, falha em `useSendWhatsAppMessage` com “Sessão não encontrada na conversa”.

Arquivos/pontos a ajustar
- `supabase/migrations/<nova_migration>.sql`
- `src/hooks/use-start-conversation.ts`
- `src/components/chat/FloatingChat.tsx`
- `src/hooks/use-whatsapp-conversations.ts` (tratamento defensivo de envio)

Plano de implementação
1) Corrigir função SQL quebrada
- Criar migration com `CREATE OR REPLACE FUNCTION public.can_access_lead(...)`.
- Trocar lógica de liderança para o modelo atual:
  - líder identificado em `team_members` com `is_leader = true`;
  - validar pertencimento ao mesmo time do usuário atribuído ao lead.
- Manter `SECURITY DEFINER` + `SET search_path = public`.

2) Alinhar RLS ao comportamento pedido (acesso por sessão/propriedade/grant)
- Na mesma migration, ajustar políticas de SELECT:
  - `whatsapp_conversations`: remover fallback por `can_access_lead`, manter apenas `is_super_admin() OR can_access_whatsapp_session(session_id)`.
  - `whatsapp_messages`: mesma lógica (remover subquery por lead).
- Isso evita que usuário abra conversa de sessão sem acesso e elimina a superfície que aciona `can_access_lead` nessas telas.

3) Fix no fluxo de iniciar conversa pelo botão do lead
- Em `useFindConversationByPhone`, aceitar `sessionId` e filtrar buscas por essa sessão quando o fluxo vem do botão WhatsApp.
- Em `FloatingChat`, passar `sessionId` atual para `findConversation`.
- Regra:
  - Se existir conversa na sessão selecionada, abre ela.
  - Se não existir, cria nova conversa na sessão selecionada.
  - Não abrir conversa de outra sessão nesse fluxo.

4) Defesa adicional no envio
- Em `useSendWhatsAppMessage`, quando `conversation.session` vier ausente:
  - tentar carregar sessão por `conversation.session_id` (se acessível);
  - se continuar ausente, retornar erro orientativo claro (“conversa pertence a outra sessão sem permissão; iniciar pela sessão conectada”).
- Evita mensagem genérica e melhora diagnóstico no front.

5) Validação pós-fix (E2E)
- Cenário Jessica (conta própria):
  - abrir `/crm/pipelines`;
  - clicar botão WhatsApp no card de lead;
  - confirmar que chat abre com sessão conectada válida;
  - enviar mensagem com sucesso (sem “sessão não encontrada”).
- Confirmar no Network:
  - sem `42703`;
  - `GET whatsapp_conversations` e `GET whatsapp_messages` com 200.
- Confirmar regra de acesso:
  - admin vê todas da org;
  - usuário comum só próprias + concedidas.

Risco e mitigação
- Risco: remover fallback por lead impactar quem via conversa sem grant de sessão.
- Mitigação: isso está alinhado com sua regra de negócio atual (sessão própria/concedida). Se precisarem leitura por lead no futuro, reintroduzimos em política separada e explícita (somente leitura).
