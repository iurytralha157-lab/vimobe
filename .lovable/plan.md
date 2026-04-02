

# Adicionar Permissões de Automações nas Funções

## Problema
No painel de Funções e Permissões, a opção "Automações" não aparece porque as entradas `automations_view` e `automations_edit` não existem na tabela `available_permissions` do banco de dados. O código frontend já tem o grupo mapeado, só faltam os registros no banco.

## Solução
Criar uma migration que insere os dois registros de permissão na tabela `available_permissions`:

- **`automations_view`** — "Visualizar Automações" (categoria: modules)
- **`automations_edit`** — "Editar Automações" (categoria: modules)

## Detalhes técnicos

### Migration SQL
Inserir na tabela `available_permissions`:
```sql
INSERT INTO available_permissions (key, name, description, category) VALUES
  ('automations_view', 'Visualizar Automações', 'Permite visualizar a lista de automações e seus fluxos', 'modules'),
  ('automations_edit', 'Editar Automações', 'Permite criar, editar e excluir automações', 'modules');
```

### Aplicar guard na página de Automações
Envolver a rota `/automations` com `PermissionGuard` usando a permissão `automations_view`, garantindo que usuários sem acesso sejam redirecionados.

Nenhuma alteração de frontend no RolesTab é necessária — o grupo `automations` já está configurado nas linhas 77 do componente.

