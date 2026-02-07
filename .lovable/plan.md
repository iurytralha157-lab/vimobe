
# Plano de Correção: Página de Contatos Vazia

## Problema Identificado

A função `list_contacts_paginated` está quebrada porque referencia uma coluna que **não existe** no banco de dados:

```sql
-- CÓDIGO ERRADO (linha 71 da migração atual):
LEFT JOIN organization_roles r ON r.id = u.organization_role_id
-- A coluna 'organization_role_id' NÃO existe na tabela 'users'!
```

O schema real do sistema de permissões é:
- `users` - tabela de usuários (sem coluna de role customizado)
- `user_organization_roles` - tabela pivô: `user_id` + `organization_role_id`
- `organization_roles` - tabela de funções/roles
- `organization_role_permissions` - permissões: `organization_role_id` + `permission_key`

## Solução

Reescrever a verificação de permissões RBAC usando a mesma lógica que já funciona na função `user_has_permission()`, que usa a tabela pivô `user_organization_roles` corretamente.

### Mudança Específica

**De** (código quebrado):
```sql
SELECT 
  COALESCE(bool_or(orp.permission_key = 'lead_view_all'), FALSE),
  COALESCE(bool_or(orp.permission_key = 'lead_view_team'), FALSE)
INTO v_has_view_all, v_has_view_team
FROM users u
LEFT JOIN organization_roles r ON r.id = u.organization_role_id  -- ERRADO!
LEFT JOIN organization_role_permissions orp ON orp.role_id = r.id
WHERE u.id = v_user_id;
```

**Para** (código corrigido):
```sql
SELECT 
  COALESCE(bool_or(orp.permission_key = 'lead_view_all'), FALSE),
  COALESCE(bool_or(orp.permission_key = 'lead_view_team'), FALSE)
INTO v_has_view_all, v_has_view_team
FROM user_organization_roles uor
JOIN organization_role_permissions orp ON orp.organization_role_id = uor.organization_role_id
WHERE uor.user_id = v_user_id;
```

Esta abordagem:
1. Usa a tabela pivô `user_organization_roles` corretamente
2. Usa a coluna correta `organization_role_id` (não `role_id`)
3. Segue o mesmo padrão já validado em `user_has_permission()`

## Resultado Esperado

Após a correção:
- Administradores e Super Admins verão **todos os leads** da organização
- Usuários com permissão `lead_view_all` verão todos os leads
- Usuários com permissão `lead_view_team` verão leads da sua equipe
- Demais usuários verão apenas os leads atribuídos a eles

---

## Detalhes Técnicos

Uma única migração SQL será criada para:
1. Dropar a função existente (com assinatura exata incluindo `p_deal_status`)
2. Recriar a função com os JOINs corrigidos

Todas as funcionalidades existentes serão preservadas:
- Filtros por pipeline, etapa, responsável, tags, fonte
- Filtro por status do negócio (Aberto/Ganho/Perdido)
- Filtro por data de criação
- Ordenação e paginação
