
## Problema Identificado

A tabela `cadence_templates` no banco de dados **não possui o campo `pipeline_id`** — ela só tem `stage_key` (ex: `"base"`, `"contactados"`). Como o mesmo `stage_key` existe em múltiplas pipelines, o filtro atual retorna cadências de pipelines erradas.

Exemplo real no banco:
- Template `"Base"` (stage_key: `base`) → aparece para as pipelines "Vendas", "follow up", "Tráfego", "TIME ELITE", "Fernando", etc.
- O filtro por `stage_key` não distingue qual pipeline é cada um

### Solução

Adicionar o campo `pipeline_id` na tabela `cadence_templates` e vincular cada template ao estágio correto de cada pipeline.

### Passo 1 — Migração no Banco

Criar uma migration que:
1. Adiciona a coluna `pipeline_id` (nullable UUID) na tabela `cadence_templates`
2. Preenche o `pipeline_id` cruzando `cadence_templates.stage_key` com `stages.stage_key` (usando o estágio mais recente com aquele key por organização)
3. Cria um índice na nova coluna para performance

### Passo 2 — Atualizar o Hook `useCadenceTemplates`

Modificar o `queryFn` em `src/hooks/use-cadences.ts`:

- Ao buscar estágios para criar templates faltantes, incluir `pipeline_id` no select
- Ao inserir templates faltantes, incluir `pipeline_id` no objeto inserido
- Ao buscar todos os templates, filtrar por `pipeline_id` dos estágios da organização atual (evitar trazer templates de outras organizações com mesmo stage_key)

### Passo 3 — Atualizar o Filtro no `CadencesTab`

Modificar `src/components/crm-management/CadencesTab.tsx`:

- Em vez de filtrar por `stage_key` (que é ambíguo), filtrar diretamente por `template.pipeline_id === selectedPipelineId`
- Isso torna o filtro determinístico e correto

### Lógica de filtragem corrigida

```
ANTES (errado):
  stage_key "base" → 1 template, mas JOIN retorna N linhas (uma por pipeline)
  Filtro por stage_key traz o mesmo template para múltiplas pipelines

DEPOIS (correto):
  cadence_templates.pipeline_id = "id-da-pipeline-selecionada"
  Cada template pertence a exatamente 1 pipeline → filtro funciona perfeitamente
```

### Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `supabase/migrations/YYYYMMDD_add_pipeline_id_to_cadence_templates.sql` | Migration: adiciona `pipeline_id`, preenche dados existentes |
| `src/hooks/use-cadences.ts` | Inclui `pipeline_id` ao criar/buscar templates |
| `src/components/crm-management/CadencesTab.tsx` | Filtro usa `template.pipeline_id` em vez de `stage_key` |

### Resultado esperado

Ao selecionar "Vendas" no filtro, aparecem **apenas** os estágios/cadências da pipeline Vendas. Ao selecionar "Fernando", aparecem apenas os da pipeline Fernando. Sem repetições, sem cadências de outras pipelines aparecendo.
