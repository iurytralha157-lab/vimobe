
# Plano de Correção: Permissões RBAC e Visibilidade do Super Admin

## Resumo dos Problemas Identificados

### Problema 1: Super Admin Não Vê as Funções ao Impersonar
**Causa Raiz:** Em `src/pages/Settings.tsx`, linha 284, a aba "Funções" só aparece para usuários com `profile?.role === 'admin'`. Porém, o super_admin tem role `super_admin`, não `admin`, então a aba fica escondida.

### Problema 2: Usuários com Permissão `lead_view_all` Não Veem Todos os Leads
**Causa Raiz:** Embora a migração do banco de dados tenha sido aplicada corretamente e a função `list_contacts_paginated` esteja atualizada, a variável `v_can_view_all` só é inicializada quando o bloco `IF NOT v_is_admin` executa. O problema é que as variáveis booleanas em PostgreSQL inicializam como `NULL`, e `NULL OR TRUE` = `TRUE`, mas `NULL OR FALSE` = `NULL` (falsy).

No entanto, a lógica parece correta. O problema real pode ser:
1. O cache da função no banco de dados não foi atualizado
2. A Izadora precisa fazer logout/login para a sessão atualizar
3. Há um problema de timing entre a migração e a atualização do cache

---

## Plano de Implementação

### Etapa 1: Corrigir Visibilidade da Tab "Funções" para Super Admin

**Arquivo:** `src/pages/Settings.tsx`

**Alteração:** Modificar a condição na linha 284 para incluir super_admin quando estiver impersonando:

```typescript
// Antes
{profile?.role === 'admin' && <TabsTrigger value="roles" ...>

// Depois  
{(profile?.role === 'admin' || isSuperAdmin) && <TabsTrigger value="roles" ...>
```

**Dependência:** Importar `isSuperAdmin` do contexto de autenticação (já disponível via `useAuth`).

---

### Etapa 2: Reforçar a Lógica RBAC na Função do Banco

**Arquivo:** Nova migração SQL

**Problema Potencial:** As variáveis `v_can_view_all` e `v_can_view_team` permanecem `NULL` se não entrarem no bloco IF, o que pode causar comportamento inesperado na expressão OR.

**Solução:** Inicializar explicitamente as variáveis como `FALSE` antes do bloco condicional:

```sql
-- Após as declarações, adicionar inicialização:
v_can_view_all := FALSE;
v_can_view_team := FALSE;

-- Isso garante que a expressão OR funcione corretamente:
-- FALSE OR TRUE = TRUE (quando o usuário tem permissão)
-- FALSE OR FALSE = FALSE (fallback para apenas seus leads)
```

---

### Etapa 3: Atualizar Condições Relacionadas

**Arquivos Afetados:**
1. `src/pages/Settings.tsx` - Tab Funções
2. `src/components/settings/RolesTab.tsx` - Verificar se há outras condições de admin-only

---

## Detalhamento Técnico

### Mudanças no Frontend

1. **Settings.tsx:**
   - Adicionar `isSuperAdmin` ao destructuring do `useAuth()`
   - Alterar condição da TabsTrigger "roles" para `(profile?.role === 'admin' || isSuperAdmin)`

### Mudanças no Banco de Dados

1. **Nova Migração SQL:**
```sql
CREATE OR REPLACE FUNCTION public.list_contacts_paginated(...)
...
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_super_admin BOOLEAN;
  v_can_view_all BOOLEAN := FALSE;  -- Inicialização explícita
  v_can_view_team BOOLEAN := FALSE; -- Inicialização explícita
  v_team_member_ids UUID[];
  v_offset INT;
  v_total BIGINT;
BEGIN
  -- resto do código permanece igual
...
```

---

## Ordem de Execução

1. Aplicar migração SQL para corrigir inicialização das variáveis
2. Modificar `Settings.tsx` para permitir super_admin ver a tab Funções
3. Testar com usuário Izadora (logout/login pode ser necessário)
4. Testar com conta super_admin impersonando a organização

---

## Validação

- Após implementação, Izadora deve ver todos os 6 leads (não apenas os 2 atribuídos a ela)
- Super Admin impersonando deve ver a aba "Funções" nas configurações
- Super Admin deve poder criar, editar e excluir funções da organização
