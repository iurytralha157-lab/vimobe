
# Fase 1: Implementação de Logs de Auditoria

## Resumo Executivo

Este plano implementa a primeira fase do sistema de auditoria, adicionando rastreamento de todas as ações críticas do sistema: login/logout, impersonação, e operações CRUD de leads e usuários.

---

## O Que Será Implementado

### 1. Autenticação (Login/Logout/Impersonação)
- Log de cada login bem-sucedido
- Log de cada logout
- Log de início e fim de impersonação por Super Admin

### 2. CRUD de Leads
- Log de criação de leads
- Log de atualização de leads (com dados antigos e novos)
- Log de exclusão de leads

### 3. CRUD de Usuários
- Log de atualização de usuários (incluindo mudanças de role)

### 4. Operações Super Admin
- Log de criação de organizações
- Log de atualização de organizações
- Log de exclusão de organizações
- Log de atualização de usuários pelo Super Admin

---

## Arquivos a Serem Modificados

| Arquivo | Alterações |
|---------|------------|
| `src/contexts/AuthContext.tsx` | Adicionar logs em `signIn`, `signOut`, `startImpersonate`, `stopImpersonate` |
| `src/hooks/use-leads.ts` | Adicionar logs em `useCreateLead`, `useUpdateLead`, `useDeleteLead` |
| `src/hooks/use-users.ts` | Adicionar log em `useUpdateUser` |
| `src/hooks/use-super-admin.ts` | Adicionar logs em todas as mutations |

---

## Detalhes Técnicos

### Função de Auditoria Existente

O sistema já possui a função `logAuditAction` em `src/hooks/use-audit-logs.ts`:

```typescript
async function logAuditAction(
  action: string,        // 'login', 'logout', 'create', 'update', 'delete'
  entityType: string,    // 'session', 'lead', 'user', 'organization'
  entityId?: string,     // ID da entidade afetada
  oldData?: Record,      // Dados antes da alteração
  newData?: Record,      // Dados após a alteração
  organizationId?: string
)
```

### Padrão de Ações a Serem Registradas

| Ação | entity_type | Descrição |
|------|-------------|-----------|
| `login` | session | Usuário fez login |
| `logout` | session | Usuário fez logout |
| `impersonate_start` | organization | Super Admin iniciou impersonação |
| `impersonate_stop` | organization | Super Admin encerrou impersonação |
| `create` | lead | Novo lead criado |
| `update` | lead | Lead atualizado |
| `delete` | lead | Lead excluído |
| `update` | user | Usuário atualizado |
| `create` | organization | Nova organização criada |
| `update` | organization | Organização atualizada |
| `delete` | organization | Organização excluída |

---

## Implementação Detalhada

### 1. AuthContext.tsx

**Modificações na função `signIn`:**
```typescript
const signIn = async (email: string, password: string) => {
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  
  if (!error && data.user) {
    // Log audit action (usando setTimeout para evitar deadlock)
    setTimeout(async () => {
      await logAuditAction('login', 'session', data.user.id, undefined, {
        email,
        login_at: new Date().toISOString()
      });
    }, 0);
  }
  
  return { error };
};
```

**Modificações na função `signOut`:**
```typescript
const signOut = async () => {
  // Log antes de limpar estados
  if (user) {
    await logAuditAction('logout', 'session', user.id);
  }
  // ... resto da função existente
};
```

**Modificações na função `startImpersonate`:**
```typescript
const startImpersonate = async (orgId: string, orgName: string) => {
  // Log da ação
  await logAuditAction('impersonate_start', 'organization', orgId, undefined, {
    org_name: orgName,
    started_at: new Date().toISOString()
  });
  // ... resto da função existente
};
```

**Modificações na função `stopImpersonate`:**
```typescript
const stopImpersonate = async () => {
  // Log da ação
  if (impersonating) {
    await logAuditAction('impersonate_stop', 'organization', impersonating.orgId, undefined, {
      org_name: impersonating.orgName,
      stopped_at: new Date().toISOString()
    });
  }
  // ... resto da função existente
};
```

### 2. use-leads.ts

**Em `useCreateLead`:**
```typescript
// Após criar o lead com sucesso
await logAuditAction(
  'create',
  'lead',
  data.id,
  undefined,
  { name: lead.name, phone: lead.phone, source: lead.source },
  organizationId
);
```

**Em `useUpdateLead`:**
```typescript
// Após atualizar o lead com sucesso
await logAuditAction(
  'update',
  'lead',
  id,
  { stage_id: currentLead?.stage_id, assigned_user_id: currentLead?.assigned_user_id },
  updates,
  data.organization_id
);
```

**Em `useDeleteLead`:**
```typescript
// Antes de excluir, buscar dados do lead
const { data: leadData } = await supabase
  .from('leads')
  .select('name, phone, organization_id')
  .eq('id', id)
  .single();

// Após excluir com sucesso
await logAuditAction(
  'delete',
  'lead',
  id,
  leadData,
  undefined,
  leadData?.organization_id
);
```

### 3. use-users.ts

**Em `useUpdateUser`:**
```typescript
// Buscar dados antigos antes de atualizar
const { data: oldUser } = await supabase
  .from('users')
  .select('name, role, organization_id, is_active')
  .eq('id', id)
  .single();

// Após atualizar com sucesso
await logAuditAction(
  'update',
  'user',
  id,
  oldUser,
  updates,
  oldUser?.organization_id
);
```

### 4. use-super-admin.ts

**Em `createOrganization`:**
```typescript
// No onSuccess
await logAuditAction('create', 'organization', result.organization.id, undefined, {
  name: data.name,
  admin_email: data.adminEmail
});
```

**Em `updateOrganization`:**
```typescript
// Antes de atualizar, buscar dados antigos
const { data: oldOrg } = await supabase
  .from('organizations')
  .select('name, is_active, subscription_status')
  .eq('id', id)
  .single();

// Após sucesso
await logAuditAction('update', 'organization', id, oldOrg, updates);
```

**Em `deleteOrganization`:**
```typescript
// Buscar nome antes de excluir
const { data: org } = await supabase
  .from('organizations')
  .select('name')
  .eq('id', organizationId)
  .single();

// Após sucesso
await logAuditAction('delete', 'organization', organizationId, { name: org?.name });
```

**Em `updateUser`:**
```typescript
await logAuditAction('update', 'user', userId, undefined, updates);
```

**Em `deleteUser`:**
```typescript
await logAuditAction('delete', 'user', userId);
```

---

## Verificação Pós-Implementação

Após a implementação, os logs aparecerão na página `/admin/audit` com:
- Data/hora da ação
- Usuário que executou
- Tipo de ação (login, logout, create, update, delete, etc.)
- Entidade afetada
- Dados antigos e novos (quando aplicável)

---

## Considerações de Segurança

- Logs de auditoria são gravados de forma assíncrona para não bloquear a operação principal
- Erros na gravação de logs são capturados silenciosamente para não afetar a experiência do usuário
- O `user_agent` é capturado automaticamente pela função `logAuditAction`

---

## Próximos Passos (Fases Futuras)

- **Fase 2**: Edge function para capturar IP real do cliente
- **Fase 3**: Expandir auditoria para módulo financeiro e equipes
- **Fase 4**: Melhorias na interface de visualização de logs
