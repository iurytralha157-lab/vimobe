O usuário relatou que todas as instâncias do WhatsApp estão visíveis para todos os usuários da organização, o que não deveria acontecer. O objetivo é restringir a visibilidade para que:
1. Usuários comuns vejam apenas suas próprias instâncias (owner).
2. Usuários comuns vejam instâncias de terceiros apenas se tiverem acesso explicitamente concedido (tabela `whatsapp_session_access`).
3. Administradores da organização continuem vendo todas as instâncias da sua própria organização.
4. Super administradores continuem vendo tudo.

Para isso, preciso:
1. Identificar e remover políticas de RLS excessivamente permissivas.
2. Unificar a lógica de acesso usando funções auxiliares robustas.
3. Aplicar as novas políticas nas tabelas `whatsapp_sessions`, `whatsapp_conversations` e `whatsapp_messages`.

### Detalhes Técnicos

1. **Remoção de Políticas Antigas**:
   - `whatsapp_sessions`: Remover "Users can view their own sessions", "Users can view sessions they own or have access to", etc.
   - `whatsapp_messages`: Remover "Users can view their own messages".
   - `whatsapp_conversations`: Remover qualquer política que use apenas o ID da organização.

2. **Novas Políticas para `whatsapp_sessions`**:
   - SELECT: Usar `is_super_admin() OR can_access_whatsapp_session(id)`.
   - INSERT: Apenas para a própria organização e o próprio usuário como dono.
   - UPDATE/DELETE: Apenas dono ou administrador da organização.

3. **Novas Políticas para `whatsapp_conversations` e `whatsapp_messages`**:
   - Devem herdar o acesso da sessão vinculada através da função `can_view_whatsapp_conversation`.

### Implementação

Vou criar uma nova migração SQL para consolidar essas mudanças, garantindo que a lógica de `is_admin()` e `can_access_whatsapp_session` esteja alinhada com as necessidades do usuário.

**Nota**: A função `can_access_whatsapp_session` já existe e parece correta, mas as políticas existentes estão sobrescrevendo o comportamento desejado.
