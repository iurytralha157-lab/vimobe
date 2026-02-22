

# Correcao: Edge Function `resolve-site-domain` com colunas inexistentes

## Problema

A Edge Function `resolve-site-domain` esta retornando **erro 500** ao tentar resolver o dominio `virandoachaveometodo.com.br`. O motivo e que o SELECT referencia duas colunas que nao existem na tabela `organization_sites`:
- `watermark_size`
- `watermark_position`

O erro nos logs: `record "v_site" has no field "watermark_size"` (codigo SQL 42703).

As colunas que **existem** na tabela sao: `logo_width`, `logo_height`, `watermark_enabled`, `watermark_logo_url`, `watermark_opacity`. As colunas `watermark_size` e `watermark_position` nunca foram criadas no banco.

## Solucao

### Opcao escolhida: Remover as colunas inexistentes do SELECT

Editar `supabase/functions/resolve-site-domain/index.ts` e remover `watermark_size` e `watermark_position` do SELECT na linha 34.

O frontend (`PublishedSiteWrapper.tsx` e `PreviewSiteWrapper.tsx`) ja trata esses campos com fallback:
```
watermark_size: (data as any).watermark_size ?? 80,
watermark_position: (data as any).watermark_position ?? 'bottom-right',
```

Portanto, mesmo sem esses campos no retorno, o site usara os valores padrao (80 e 'bottom-right').

### Arquivo a modificar

**`supabase/functions/resolve-site-domain/index.ts`** (linha 34)
- Remover `watermark_size` do SELECT
- Remover `watermark_position` do SELECT
- Manter todos os demais campos

### Apos a correcao

1. Deploy da Edge Function
2. Testar chamando `resolve-site-domain` com `virandoachaveometodo.com.br`
3. Verificar que o dominio customizado carrega o site corretamente

