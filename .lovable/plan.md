
# Correção da Página de Contatos

## Problema Identificado

A página de Contatos está vazia porque a função SQL `list_contacts_paginated` tem erros nas referências de colunas para o sistema RBAC.

**Erro retornado pela API:**
```json
{"code":"42703","message":"column orp.role_id does not exist"}
```

## Causa Raiz

A função foi criada com nomes de colunas incorretos para as tabelas de permissões:

| Tabela | Coluna Usada (Errado) | Coluna Real (Correto) |
|--------|----------------------|----------------------|
| `user_organization_roles` | `role_id` | `organization_role_id` |
| `organization_role_permissions` | `role_id` | `organization_role_id` |
| `organization_role_permissions` | `permission_id` | `permission_key` |

## Solução

Recriar a função `list_contacts_paginated` corrigindo a lógica de verificação de permissões RBAC.

**Código atual (linhas 73-92):**
```sql
-- ERRADO
SELECT 
  EXISTS (
    SELECT 1 
    FROM user_organization_roles uor
    JOIN organization_role_permissions orp ON orp.role_id = uor.role_id
    JOIN available_permissions ap ON ap.id = orp.permission_id
    WHERE uor.user_id = v_user_id 
      AND uor.organization_id = v_org_id
      AND ap.key = 'lead_view_all'
  ),
  ...
```

**Código corrigido:**
```sql
-- CORRETO
SELECT 
  EXISTS (
    SELECT 1 
    FROM user_organization_roles uor
    JOIN organization_role_permissions orp 
      ON orp.organization_role_id = uor.organization_role_id
    JOIN available_permissions ap 
      ON ap.key = orp.permission_key
    WHERE uor.user_id = v_user_id 
      AND ap.key = 'lead_view_all'
  ),
  ...
```

## Mudanças Necessárias

Uma migração SQL será executada para:

1. Dropar a função atual com parâmetros incorretos
2. Recriar a função com os JOINs corrigidos usando:
   - `orp.organization_role_id = uor.organization_role_id`
   - `ap.key = orp.permission_key`

## Resultado Esperado

Após a correção:
- A página de Contatos exibirá todos os leads normalmente
- O erro 400 será eliminado
- O sistema RBAC funcionará corretamente (lead_view_all, lead_view_team)
- Filtros, busca e paginação funcionarão conforme esperado

## Detalhes Técnicos

A correção afeta apenas as linhas 76-92 da função, que fazem a verificação de permissões RBAC. O restante da lógica (filtros, ordenação, tags, SLA) permanece inalterado.
