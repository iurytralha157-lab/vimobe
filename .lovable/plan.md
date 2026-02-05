

# Plano: Corrigir Visibilidade de Conversas WhatsApp para Admin

## Diagnóstico

### Causa Raiz Identificada

O admin está vendo conversas de outras instâncias porque existe uma **política RLS muito permissiva** chamada `System can manage conversations` que permite acesso a **todas** as conversas da organização, ignorando o controle de acesso por sessão.

**Políticas atuais em conflito:**

| Política | Tipo | Problema |
|----------|------|----------|
| `System can manage conversations` | ALL | Permite acesso a TODAS as sessões da organização |
| `Users can view conversations from accessible sessions` | SELECT | Correta - respeita owner + session_access |

Como ambas são `PERMISSIVE`, o PostgreSQL combina com `OR`, e a política mais ampla vence.

### Visualização do Problema

```text
Política atual (errada):
┌─────────────────────────────────────────────┐
│ Admin Fernando (org 818394bf)               │
│                                             │
│ RLS: session.organization_id = minha_org    │
│ ↓                                           │
│ Vê TODAS as 5 sessões da organização ❌     │
│ - Vendas MCMV (sua)                         │
│ - Maikson (não tem acesso)                  │
│ - Gabriel (não tem acesso)                  │
│ - Guilherme (não tem acesso)                │
│ - Raquel (não tem acesso)                   │
└─────────────────────────────────────────────┘

Comportamento correto (após correção):
┌─────────────────────────────────────────────┐
│ Admin Fernando (org 818394bf)               │
│                                             │
│ RLS: owner_user_id = eu OR session_access   │
│ ↓                                           │
│ Vê apenas sessões autorizadas ✓             │
│ - Vendas MCMV (owner)                       │
└─────────────────────────────────────────────┘
```

---

## Solução

### Parte 1: Correção da RLS no Banco de Dados

Remover a política permissiva e garantir que apenas a política restritiva seja aplicada.

**SQL Migration:**

```sql
-- 1. Remover política permissiva demais
DROP POLICY IF EXISTS "System can manage conversations" ON whatsapp_conversations;

-- 2. Remover políticas duplicadas de super admin
DROP POLICY IF EXISTS "Super admin access whatsapp_conversations" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Super admin can manage whatsapp conversations" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Super admin can view all whatsapp conversations" ON whatsapp_conversations;

-- 3. Garantir que a política correta existe para SELECT
DROP POLICY IF EXISTS "Users can view conversations from accessible sessions" ON whatsapp_conversations;

CREATE POLICY "Users can view conversations from accessible sessions"
ON whatsapp_conversations FOR SELECT
USING (
  is_super_admin() 
  OR (
    session_id IN (
      SELECT ws.id 
      FROM whatsapp_sessions ws
      WHERE ws.organization_id = get_user_organization_id()
        AND (
          ws.owner_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM whatsapp_session_access wsa
            WHERE wsa.session_id = ws.id
              AND wsa.user_id = auth.uid()
              AND wsa.can_view = true
          )
        )
    )
  )
);

-- 4. Política para INSERT (webhooks e sistema)
DROP POLICY IF EXISTS "Users can insert conversations for their organization" ON whatsapp_conversations;

CREATE POLICY "Allow insert conversations for organization"
ON whatsapp_conversations FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id()
  OR is_super_admin()
);

-- 5. Política para UPDATE (já existe e está correta)
-- A política existente já verifica owner_user_id e session_access

-- 6. Política para DELETE
DROP POLICY IF EXISTS "Users can delete conversations from accessible sessions" ON whatsapp_conversations;

CREATE POLICY "Users can delete conversations from accessible sessions"
ON whatsapp_conversations FOR DELETE
USING (
  is_super_admin() 
  OR (
    session_id IN (
      SELECT ws.id 
      FROM whatsapp_sessions ws
      WHERE ws.organization_id = get_user_organization_id()
        AND (
          ws.owner_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM whatsapp_session_access wsa
            WHERE wsa.session_id = ws.id
              AND wsa.user_id = auth.uid()
              AND wsa.can_view = true
          )
        )
    )
  )
);
```

### Parte 2: Proteção Adicional no Frontend (Defense in Depth)

Modificar `useWhatsAppConversations` para filtrar conversas pelas sessões acessíveis quando "Todos os canais" estiver selecionado.

**Arquivo:** `src/hooks/use-whatsapp-conversations.ts`

```typescript
export function useWhatsAppConversations(
  sessionId?: string, 
  filters?: ConversationFilters,
  accessibleSessionIds?: string[]  // Novo parâmetro
) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-conversations", sessionId, filters, accessibleSessionIds],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_conversations")
        .select(...)
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      } else if (accessibleSessionIds && accessibleSessionIds.length > 0) {
        // NOVA LÓGICA: Filtrar por sessões acessíveis quando "Todos"
        query = query.in("session_id", accessibleSessionIds);
      }

      // ... resto da query
    },
  });
}
```

**Arquivo:** `src/pages/Conversations.tsx`

```typescript
// Passar IDs das sessões acessíveis para o hook
const { data: sessions } = useAccessibleSessions();
const accessibleSessionIds = sessions?.map(s => s.id) || [];

const { data: conversations } = useWhatsAppConversations(
  selectedSessionId === "all" ? undefined : selectedSessionId,
  { hideGroups, showArchived },
  selectedSessionId === "all" ? accessibleSessionIds : undefined  // Novo
);
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Corrigir políticas RLS |
| `src/hooks/use-whatsapp-conversations.ts` | Aceitar lista de sessões acessíveis |
| `src/pages/Conversations.tsx` | Passar sessões acessíveis para o hook |

---

## Resultado Esperado

### Antes
- Admin Fernando vê conversas de 5 sessões da organização
- Checkbox "Todos os canais" lista todas as instâncias

### Depois
- Admin Fernando vê apenas conversas da sessão "Vendas MCMV" (que ele é dono)
- "Todos os canais" mostra apenas sessões às quais tem acesso real
- Para ver outras sessões, precisa receber acesso via "Gerenciar Acesso" em Configurações WhatsApp

---

## Segurança

Esta correção reforça a privacidade seguindo o princípio estabelecido na memória:

> "A visibilidade das sessões e conversas do WhatsApp é estritamente restrita ao dono da sessão ou usuários com acesso concedido na tabela whatsapp_session_access. Esta restrição de privacidade aplica-se a todos os usuários, incluindo Administradores da organização."

---

## Verificação Pós-Implementação

1. Logar como admin que não é dono de nenhuma sessão → Não deve ver conversas
2. Logar como admin dono de 1 sessão → Deve ver apenas conversas dessa sessão
3. Conceder acesso a outra sessão via "Gerenciar Acesso" → Deve ver conversas das 2 sessões
4. Super admin deve continuar vendo tudo (para suporte)

