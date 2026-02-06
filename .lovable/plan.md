
# Correção: Colunas Faltantes na Tabela lead_meta

## Problema Detectado

O webhook falhou ao inserir dados de rastreamento porque algumas colunas não existem na tabela `lead_meta`:

| Campo | Status |
|-------|--------|
| `campaign_name` | ❌ Não existe |
| `adset_name` | ❌ Não existe |
| `ad_name` | ❌ Não existe |
| `platform` | ❌ Não existe |

O código do webhook está tentando inserir esses campos, mas eles não foram criados na migration.

## Solução

Criar uma migration adicional para adicionar as colunas faltantes:

```sql
ALTER TABLE lead_meta 
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS adset_name text,
  ADD COLUMN IF NOT EXISTS ad_name text,
  ADD COLUMN IF NOT EXISTS platform text;
```

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Adicionar colunas faltantes |
| `src/integrations/supabase/types.ts` | Atualizar tipos com novos campos |

## Após a Correção

Vou testar o webhook novamente para confirmar que:
1. O lead é criado com sucesso
2. Todos os dados de rastreamento são salvos em `lead_meta`
3. Os dados aparecem na seção de Rastreamento do card do lead
