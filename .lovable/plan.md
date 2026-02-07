
# Correção: Conflito de Funções no Banco de Dados

## Problema Identificado

Existem **3 versões duplicadas** da função `list_contacts_paginated` no banco de dados:

| OID | Parâmetro p_deal_status | Tipo created_from/to |
|-----|-------------------------|---------------------|
| 42484 | Não existe | text |
| 57258 | Existe | timestamp with time zone |
| 57261 | Existe | text |

Quando a aplicação chama a RPC, o PostgREST retorna erro 300:
> "Could not choose the best candidate function between..."

O sistema não consegue decidir qual das 3 versões usar, resultando em **zero leads exibidos**.

## Solução

Executar uma migração SQL que:

1. Remove as duas versões antigas (OID 42484 e 57258)
2. Mantém apenas a versão correta (OID 57261) que já tem:
   - Parâmetro `p_deal_status`
   - Tipos `text` para `p_created_from` e `p_created_to`
   - Lógica RBAC corrigida usando `user_organization_roles`

## Resultado Esperado

Após a correção:
- A página de Contatos voltará a exibir todos os leads
- Filtros de data, pipeline, status e busca funcionarão normalmente
- Permissões RBAC serão respeitadas (admin vê todos, corretor vê apenas os seus)

## Detalhes Técnicos

Migração SQL a ser executada:

```sql
-- Dropar versão antiga sem p_deal_status
DROP FUNCTION IF EXISTS public.list_contacts_paginated(
  text, uuid, uuid, uuid, boolean, uuid, text, text, text, text, text, integer, integer
);

-- Dropar versão com timestamptz
DROP FUNCTION IF EXISTS public.list_contacts_paginated(
  text, uuid, uuid, uuid, boolean, uuid, text, text, 
  timestamp with time zone, timestamp with time zone, 
  text, text, integer, integer
);
```

Isso deixará apenas a versão correta com assinatura única, eliminando a ambiguidade.
