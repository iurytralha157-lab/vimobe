
# Plano: Adicionar Permissões para Planos, Localidades e Clientes Telecom

## Objetivo
Adicionar novas opções de permissão no sistema de Funções (RBAC) para os módulos de Telecom:
- **Planos de Serviço**: Ver e Editar
- **Localidades (Cobertura)**: Ver e Editar  
- **Clientes Telecom**: Ver todos, Ver próprios, Editar

---

## Novas Permissões a Adicionar

| Chave | Nome | Descrição | Categoria |
|-------|------|-----------|-----------|
| `plans_view` | Ver planos | Visualizar catálogo de planos | modules |
| `plans_edit` | Editar planos | Criar, editar e excluir planos | modules |
| `coverage_view` | Ver localidades | Visualizar áreas de cobertura | modules |
| `coverage_edit` | Editar localidades | Criar, editar e excluir localidades | modules |
| `customers_view_all` | Ver todos os clientes | Visualizar todos os clientes telecom | data |
| `customers_view_own` | Ver próprios clientes | Ver apenas clientes criados por si | data |
| `customers_edit` | Editar clientes | Criar, editar e excluir clientes | data |

---

## Arquivos a Modificar

### 1. Migração SQL (nova)
Inserir as novas permissões na tabela `available_permissions`:

```sql
INSERT INTO available_permissions (key, name, description, category) VALUES
('plans_view', 'Ver planos', 'Visualizar catálogo de planos de serviço', 'modules'),
('plans_edit', 'Editar planos', 'Criar, editar e excluir planos de serviço', 'modules'),
('coverage_view', 'Ver localidades', 'Visualizar áreas de cobertura', 'modules'),
('coverage_edit', 'Editar localidades', 'Criar, editar e excluir áreas de cobertura', 'modules'),
('customers_view_all', 'Ver todos os clientes', 'Visualizar todos os clientes telecom da organização', 'data'),
('customers_view_own', 'Ver próprios clientes', 'Visualizar apenas clientes criados por si', 'data'),
('customers_edit', 'Editar clientes', 'Criar, editar e excluir clientes telecom', 'data');
```

### 2. `src/pages/ServicePlans.tsx`
- Verificar permissão `plans_view` para acesso à página
- Verificar permissão `plans_edit` para mostrar botões de criar/editar/excluir
- Substituir checagem `isAdmin` por verificação de permissão

**Antes:**
```tsx
const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
// ...
{isAdmin && (
  <Button onClick={() => setFormOpen(true)}>
    <Plus /> Novo Plano
  </Button>
)}
```

**Depois:**
```tsx
import { useUserPermissions } from '@/hooks/use-user-permissions';
// ...
const { hasPermission } = useUserPermissions();
const canEdit = hasPermission('plans_edit');
// ...
{canEdit && (
  <Button onClick={() => setFormOpen(true)}>
    <Plus /> Novo Plano
  </Button>
)}
```

### 3. `src/pages/CoverageAreas.tsx`
- Verificar permissão `coverage_view` para acesso
- Verificar permissão `coverage_edit` para botões de edição
- Mesma lógica do ServicePlans

### 4. `src/pages/TelecomCustomers.tsx`
- Verificar `customers_view_all` para ver todos os clientes
- Verificar `customers_view_own` para ver apenas os próprios
- Verificar `customers_edit` para criar/editar/excluir
- Atualizar query do hook `useTelecomCustomers` para filtrar por `created_by` quando não tiver `customers_view_all`

### 5. `src/hooks/use-telecom-customers.ts`
Adicionar lógica de filtragem baseada em permissão:

```tsx
// Se não tem permissão de ver todos, filtrar por created_by
if (!hasViewAllPermission) {
  query = query.eq('created_by', userId);
}
```

---

## Lógica de Permissões

### Planos
- `plans_view`: Pode acessar a página e ver os planos
- `plans_edit`: Pode criar, editar e excluir planos (inclui view)
- Admin/Super Admin: Sempre tem ambos

### Localidades
- `coverage_view`: Pode acessar a página e ver localidades
- `coverage_edit`: Pode criar, editar e excluir (inclui view)
- Admin/Super Admin: Sempre tem ambos

### Clientes
- `customers_view_own`: Vê apenas clientes que ele criou
- `customers_view_all`: Vê todos os clientes da organização
- `customers_edit`: Pode criar, editar e excluir
- Admin/Super Admin: Sempre vê todos e pode editar

---

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| Nova migração SQL | Inserir 7 novas permissões |
| `ServicePlans.tsx` | Usar `hasPermission('plans_edit')` ao invés de `isAdmin` |
| `CoverageAreas.tsx` | Usar `hasPermission('coverage_edit')` ao invés de `isAdmin` |
| `TelecomCustomers.tsx` | Adicionar lógica de permissões para view/edit |
| `use-telecom-customers.ts` | Filtrar por `created_by` quando necessário |

---

## Observações Técnicas

1. **Compatibilidade**: As páginas continuam funcionando para admins sem necessidade de atribuir permissões - o hook `useUserPermissions` já retorna `true` para admins e super admins.

2. **Segurança**: A filtragem de clientes por `created_by` será feita no frontend E no RLS do banco para garantir segurança em camadas.

3. **Categoria**: Planos e Localidades ficam em `modules` pois são módulos do sistema. Clientes ficam em `data` pois seguem o padrão de "visibilidade de dados" como os leads.
