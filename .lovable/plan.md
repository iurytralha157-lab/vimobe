
# Plano: Restaurar Acesso Padrão dos Usuários

## Problema Identificado
Adicionamos guardas de permissão (`PermissionGuard permission="module_crm"`) que exigem permissões explícitas através do sistema de "Funções". Usuários sem função atribuída perderam acesso a:
- Pipeline
- Contatos
- Conversas WhatsApp
- Clientes Telecom

## Comportamento Correto Desejado
- **Por padrão**, todo usuário autenticado tem acesso às funcionalidades básicas
- O sistema de "Funções" serve para **ajustar** (expandir com `lead_view_all` ou restringir removendo permissões)
- Apenas quando uma função é atribuída e essa função **não tem** a permissão, o acesso é negado

## Mudanças Necessárias

### 1. Remover PermissionGuard das Rotas Básicas
**Arquivo:** `src/App.tsx`

Remover o `PermissionGuard` das seguintes rotas, mantendo apenas `ProtectedRoute`:
- `/crm/pipelines` - Pipeline (acesso padrão)
- `/crm/contacts` - Contatos (acesso padrão)
- `/crm/conversas` - Conversas (acesso padrão)
- `/telecom/customers` - Clientes Telecom (acesso padrão)

Antes:
```tsx
<Route path="/crm/pipelines" element={<ProtectedRoute><PermissionGuard permission="module_crm"><Pipelines /></PermissionGuard></ProtectedRoute>} />
```

Depois:
```tsx
<Route path="/crm/pipelines" element={<ProtectedRoute><Pipelines /></ProtectedRoute>} />
```

### 2. Remover verificação de permission no Sidebar
**Arquivo:** `src/components/layout/AppSidebar.tsx`

Remover a propriedade `permission: 'module_crm'` dos itens de navegação:
- Pipelines (linha 32)
- Contacts (linha 43)
- Telecom Customers (linha 95)

O módulo já é controlado por `module: 'crm'` - não precisa de permissão adicional.

### 3. Atualizar FloatingChat e FloatingChatButton
**Arquivos:**
- `src/components/chat/FloatingChat.tsx`
- `src/components/chat/FloatingChatButton.tsx`

Remover a verificação `hasCrmPermission` e usar apenas `hasWhatsAppAccess`:
- Isso mantém o controle de acesso ao WhatsApp baseado em **propriedade de sessão** ou **acesso explícito** (aba Gerenciar Acessos)
- Admins continuam tendo acesso total

### 4. Atualizar hook useHasWhatsAppAccess
**Arquivo:** `src/hooks/use-whatsapp-access.ts`

Garantir que admins sempre tenham acesso:
```typescript
// Admins têm acesso total
if (profile.role === 'admin') {
  return true;
}
```

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Remover PermissionGuard de 4 rotas |
| `src/components/layout/AppSidebar.tsx` | Remover `permission` de 3 itens de nav |
| `src/components/chat/FloatingChatButton.tsx` | Remover verificação module_crm |
| `src/components/chat/FloatingChat.tsx` | Remover verificação module_crm |
| `src/hooks/use-whatsapp-access.ts` | Adicionar verificação de admin |

## Resultado Final

**Usuário comum (broker) sem função atribuída:**
- ✅ Dashboard (seus dados)
- ✅ Pipeline (seus leads)
- ✅ Contatos (seus leads)
- ✅ Conversas (conexão própria ou autorizada)
- ✅ Imóveis
- ✅ Agenda

**Usuário com função restritiva:**
- Pode ter acesso reduzido conforme configurado

**Usuário com função expandida (ex: lead_view_all):**
- Pode ver todos os leads da organização
