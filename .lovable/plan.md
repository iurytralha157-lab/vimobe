
## Sistema Multi-Contas

### Etapa 1: Banco de Dados
- Criar tabela `organization_members` (user_id, organization_id, role, is_active, joined_at)
- Migrar dados existentes de `users.organization_id` + `users.role` para `organization_members`
- Manter `users.organization_id` como "última org ativa" (backward compatibility)
- RLS: usuário vê apenas seus próprios memberships

### Etapa 2: Hook e Contexto
- Criar `use-user-organizations.ts` — busca todas as orgs do usuário via `organization_members`
- Atualizar `AuthContext`:
  - Após login, verificar quantas orgs o usuário tem
  - Se 1 org → vai direto (comportamento atual)
  - Se múltiplas → redireciona para `/select-organization`
  - Adicionar `switchOrganization()` ao contexto

### Etapa 3: Tela de Seleção
- Criar página `/select-organization` com cards das organizações
- Mostrar nome, logo, role do usuário em cada org
- Ao selecionar, atualizar `users.organization_id` e recarregar perfil

### Etapa 4: Dropdown no Header
- Adicionar seletor de organização no `AppHeader`
- Mostra org atual, permite trocar rapidamente
- Só aparece se usuário tem 2+ orgs

### Etapa 5: Ajustar Criação de Usuário
- Edge function `create-user`: ao criar/adicionar, inserir também em `organization_members`
- Se email já existe, criar apenas o vínculo em `organization_members`

### Princípios de Segurança
- Dados continuam isolados por `organization_id` (RLS existente não muda)
- Role do usuário é POR organização (admin na org A, user na org B)
- `users.organization_id` sempre reflete a org ativa atual
