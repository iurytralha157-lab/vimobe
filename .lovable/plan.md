
# Plano: Restringir Dropdown de Canais WhatsApp ao Acesso Explícito

## Problema Identificado

Na página de **Conversas** e no **FloatingChat**, o dropdown "Todos os canais" está mostrando **todos** os canais da organização para administradores, quando deveria mostrar apenas os canais que o usuário tem acesso explícito.

**Comportamento Atual (Incorreto):**
- Admins veem **todos** os canais da organização
- Usuários comuns veem apenas canais próprios ou com acesso explícito

**Comportamento Esperado:**
- **Todos os usuários** (incluindo admins) só devem ver canais onde:
  1. São **donos** da sessão (`owner_user_id`)
  2. OU têm **acesso concedido** em "Gerenciar Acessos" (`whatsapp_session_access`)

## Solução

Remover o bypass de admin no hook `useAccessibleSessions`. Atualmente existe este trecho:

```typescript
// Admins see all sessions in their organization
if (profile.role === 'admin') {
  // Retorna TODOS os canais - PROBLEMA!
}
```

Após a correção, **todos os usuários** usarão a mesma lógica de verificação de acesso.

---

## Seção Técnica

### Arquivo a Modificar
- `src/hooks/use-accessible-sessions.ts`

### Mudança

**Antes (linhas 22-35):**
```typescript
// Admins see all sessions in their organization
if (profile.role === 'admin') {
  const { data, error } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching sessions for admin:", error);
    return [];
  }
  return data as WhatsAppSession[];
}
```

**Depois:**
```typescript
// Remover completamente o bloco de bypass para admin
// Todos os usuários usam a mesma lógica de verificação de acesso
```

A lógica que permanece (e que será aplicada a todos):
```typescript
// Buscar sessões onde é owner + sessões com acesso explícito
const [ownedResult, accessResult] = await Promise.all([
  supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("owner_user_id", profile.id),
  supabase
    .from("whatsapp_session_access")
    .select("session:whatsapp_sessions!..(*)")
    .eq("user_id", profile.id)
    .eq("can_view", true)
]);
```

---

## Resultado Esperado

**Antes:**
- Admin vê: gabrielbrasil, guilherme, maikson, raquelfernandes, vendasmcmv (todos)
  
**Depois:**
- Admin vê apenas: canais onde é owner OU tem acesso em "Gerenciar Acessos"

## Arquivos Afetados

1. `src/hooks/use-accessible-sessions.ts` - Remover bypass de admin

Os componentes que usam esse hook (`Conversations.tsx`, `FloatingChat.tsx`, `FloatingChatButton.tsx`) não precisam de alteração pois já consomem os dados corretamente.
