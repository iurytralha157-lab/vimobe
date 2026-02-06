

# Correção Urgente: Aplicar Migration Pendente

## Problema Confirmado

O teste do webhook confirmou que **o lead é criado com sucesso**, mas os dados de rastreamento **não estão sendo salvos** porque as colunas não existem:

```
ERROR: Could not find the 'ad_name' column of 'lead_meta' in the schema cache
```

## Colunas Faltantes

| Coluna | Status |
|--------|--------|
| `campaign_name` | ❌ Não existe |
| `adset_name` | ❌ Não existe |
| `ad_name` | ❌ Não existe |
| `platform` | ❌ Não existe |

## Solução

### 1. Aplicar Migration SQL

```sql
ALTER TABLE lead_meta 
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS adset_name text,
  ADD COLUMN IF NOT EXISTS ad_name text,
  ADD COLUMN IF NOT EXISTS platform text;
```

### 2. Atualizar Tipos TypeScript

Atualizar `src/integrations/supabase/types.ts` para incluir os novos campos na tabela `lead_meta`.

## Após a Correção

Testarei novamente o webhook para confirmar que:
1. Todos os dados de rastreamento são salvos em `lead_meta`
2. Os dados aparecem na seção "Rastreamento" do card do lead

