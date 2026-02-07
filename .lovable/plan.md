
# Correção Final: Tabela Inexistente

## Problema Identificado

A função `list_contacts_paginated` criada na última migração tem um erro na linha 170:

```sql
LEFT JOIN pipeline_stages s ON s.id = l.stage_id
```

**A tabela `pipeline_stages` não existe.** O nome correto é apenas `stages`.

Erro retornado pela API:
```json
{"code":"42P01","message":"relation \"pipeline_stages\" does not exist"}
```

## Solução

Recriar a função corrigindo a referência da tabela:

```sql
-- ERRADO:
LEFT JOIN pipeline_stages s ON s.id = l.stage_id

-- CORRETO:
LEFT JOIN stages s ON s.id = l.stage_id
```

## Mudanças Necessárias

Uma única migração SQL será executada para:

1. Dropar a função atual (que tem o erro de tabela)
2. Recriar a função idêntica, mas com `stages` ao invés de `pipeline_stages`

## Resultado Esperado

Após a correção:
- A página de Contatos exibirá todos os leads normalmente
- O erro 404 será eliminado
- Filtros e paginação funcionarão corretamente

## Detalhes Técnicos

A migração corrigirá apenas a linha 170:

```sql
-- De:
LEFT JOIN pipeline_stages s ON s.id = l.stage_id

-- Para:
LEFT JOIN stages s ON s.id = l.stage_id
```

Todas as outras partes da função (RBAC, filtros, ordenação) já estão corretas e serão mantidas.
