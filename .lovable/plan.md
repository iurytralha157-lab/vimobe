
# Plano: Correção do Controle de Acesso WhatsApp

## Problema Identificado

O sistema atual tem um **vazamento de segurança** nas conversas do WhatsApp. Existem duas políticas RLS conflitantes na tabela `whatsapp_conversations`:

1. ✅ **Correta**: `Users can view conversations from accessible sessions` - respeita o controle de acesso por sessão
2. ❌ **Problemática**: `Users can view their organization conversations` - permite que **qualquer usuário** da organização veja **todas** as conversas apenas verificando `organization_id`

A segunda política anula completamente o controle de acesso configurado em "Gerenciar Acessos".

---

## Mudanças Propostas

### 1. Remover Política RLS Permissiva

Remover a política `Users can view their organization conversations` que permite acesso irrestrito baseado apenas em `organization_id`.

### 2. Manter Apenas a Política de Acesso Controlado

A política `Users can view conversations from accessible sessions` já implementa corretamente a lógica:
- Proprietário da sessão pode ver conversas
- Admin pode ver todas (organização)
- Usuários com acesso explícito via `whatsapp_session_access` podem ver

### 3. Adicionar Filtro no Dropdown de Sessões (Conversations)

Na página de **Conversas**, o dropdown deve mostrar apenas sessões que o usuário pode **realmente visualizar conversas**:
- Sessões onde é proprietário
- Sessões onde tem acesso via `whatsapp_session_access`
- Admins continuam vendo todas as sessões

**Nota**: Isso é diferente da página de **Configurações WhatsApp** onde admins precisam ver todas para gerenciamento.

### 4. Criar Hook `useAccessibleSessions`

Um hook específico para filtrar sessões baseado no acesso a conversas (não apenas visualização de metadados da sessão).

---

## Detalhamento Técnico

### Migração SQL

```sql
-- 1. Remover política permissiva que vaza dados
DROP POLICY IF EXISTS "Users can view their organization conversations" 
ON whatsapp_conversations;

-- 2. Remover política de update também baseada em org_id
DROP POLICY IF EXISTS "Users can update their organization conversations" 
ON whatsapp_conversations;

-- 3. Criar política de update correta baseada em acesso à sessão
CREATE POLICY "Users can update conversations from accessible sessions"
ON whatsapp_conversations FOR UPDATE
USING (
  session_id IN (
    SELECT ws.id 
    FROM whatsapp_sessions ws
    WHERE ws.organization_id = get_user_organization_id()
    AND (
      ws.owner_user_id = auth.uid()
      OR is_admin()
      OR ws.id IN (
        SELECT wsa.session_id 
        FROM whatsapp_session_access wsa
        WHERE wsa.user_id = auth.uid() AND wsa.can_view = true
      )
    )
  )
);
```

### Hook: `useAccessibleSessions`

Criar hook para retornar apenas sessões cujas conversas o usuário pode ver:

```typescript
// src/hooks/use-accessible-sessions.ts
export function useAccessibleSessions() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["accessible-sessions", profile?.id],
    queryFn: async () => {
      // Admins veem todas
      if (profile?.role === 'admin') {
        const { data } = await supabase
          .from("whatsapp_sessions")
          .select("*")
          .eq("organization_id", profile.organization_id);
        return data;
      }

      // Buscar sessões próprias + com acesso
      const { data: ownedSessions } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("owner_user_id", profile?.id);

      const { data: accessGrants } = await supabase
        .from("whatsapp_session_access")
        .select("session:whatsapp_sessions(*)")
        .eq("user_id", profile?.id)
        .eq("can_view", true);

      // Combinar e remover duplicatas
      const allSessions = [
        ...(ownedSessions || []),
        ...(accessGrants?.map(g => g.session).filter(Boolean) || [])
      ];

      return [...new Map(allSessions.map(s => [s.id, s])).values()];
    }
  });
}
```

### Atualização: `Conversations.tsx`

Trocar `useWhatsAppSessions` por `useAccessibleSessions` no dropdown:

```typescript
// Antes
const { data: sessions } = useWhatsAppSessions();

// Depois
const { data: sessions } = useAccessibleSessions();
```

### Atualização: `FloatingChat.tsx`

Mesma mudança para o chat flutuante:

```typescript
const { data: sessions } = useAccessibleSessions();
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Remover política permissiva, criar política de update correta |
| `src/hooks/use-accessible-sessions.ts` | **Novo** - Hook para sessões acessíveis |
| `src/pages/Conversations.tsx` | Usar `useAccessibleSessions` no dropdown |
| `src/components/chat/FloatingChat.tsx` | Usar `useAccessibleSessions` no dropdown |

---

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────┐
│ ANTES (Problemático)                                        │
├─────────────────────────────────────────────────────────────┤
│ Admin vê: Todas as sessões no dropdown                      │
│ Admin vê: Todas as conversas da organização (vazamento!)    │
│ Broker vê: Todas as sessões (RLS sessions permite admin)    │
│ Broker vê: Conversas de sessões sem acesso (vazamento!)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DEPOIS (Corrigido)                                          │
├─────────────────────────────────────────────────────────────┤
│ Admin vê: Todas as sessões (admin=true na policy)           │
│ Admin vê: Todas as conversas (admin=true na policy)         │
│ Broker vê: Apenas sessões próprias + com acesso explícito   │
│ Broker vê: Apenas conversas das sessões permitidas          │
└─────────────────────────────────────────────────────────────┘
```

**Nota sobre Admins**: Admins continuam tendo acesso total porque a função `is_admin()` está na política RLS. Se o requisito é que **mesmo admins** precisem de acesso explícito, a política precisa ser ajustada para remover `OR is_admin()`.

---

## Consideração Adicional

Se o usuário deseja que **admins também** precisem de acesso explícito para ver conversas (como mencionado na mensagem), a política RLS precisaria ser ainda mais restritiva, removendo `is_admin()` da cláusula. Nesse caso, o admin só teria acesso gerencial às sessões (criar, deletar, configurar acessos) mas não às conversas em si.

Isso pode ser implementado com uma flag adicional ou removendo `is_admin()` apenas da política de SELECT em `whatsapp_conversations`.
