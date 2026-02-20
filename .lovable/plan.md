
## Adicionar Filtro de Pipeline nas Cadências

### Problema atual
A aba de Cadências exibe templates baseados em `stage_key`, mas o mesmo `stage_key` (ex: "base", "novo") pode existir em múltiplas pipelines. Sem um filtro, o usuário não sabe quais cadências estão configuradas para qual pipeline — e tudo fica misturado.

### Solução
Adicionar um **Select de Pipeline** no topo da aba de Cadências. Ao selecionar uma pipeline, a lista de templates exibidos será filtrada para mostrar apenas os estágios pertencentes àquela pipeline.

### Como funciona tecnicamente

Os templates de cadência existem por `stage_key` (ex: "base", "novo"). Para filtrar por pipeline, o fluxo será:

1. Buscar todas as pipelines disponíveis (hook `usePipelines` já existe em `use-stages.ts`)
2. Ao selecionar uma pipeline, buscar os `stage_key`s dos estágios dela
3. Filtrar os templates para exibir apenas os que têm `stage_key` correspondente a essa pipeline

### Mudanças

**`src/components/crm-management/CadencesTab.tsx`** — único arquivo a editar:

- Importar `usePipelines` de `@/hooks/use-stages`
- Adicionar estado `selectedPipelineId` (padrão: `'all'` = todas)
- Adicionar um `Select` no header com as opções "Todas as pipelines" + lista de pipelines
- Ao filtrar: buscar os `stage_key`s dos estágios da pipeline selecionada e filtrar `templates` para exibir apenas os que coincidem
- Quando `'all'` estiver selecionado, exibir todos os templates (comportamento atual)

### UI resultante

```
Configure as tarefas automáticas para cada estágio do pipeline

[Pipeline: Todas as pipelines ▼]          [🔒 Somente visualização]

┌─ Base ─────┐  ┌─ Novo ──────┐  ┌─ Qualificação ─┐
│ D+0 Ligação │  │ D+0 Mensagem│  │ Nenhuma tarefa  │
│ D+1 Email   │  │             │  │                 │
└─────────────┘  └─────────────┘  └─────────────────┘
```

Quando uma pipeline específica é selecionada, apenas os estágios daquela pipeline aparecem.

### Detalhamento técnico da filtragem

```
usePipelines() → lista de pipelines para o Select

useStages(pipelineId) → retorna estágios da pipeline selecionada
  → extrai os stage_keys desses estágios
  → filtra templates onde template.stage_key está na lista

Quando selectedPipelineId === 'all': mostrar todos os templates
```

Para evitar uma nova query, o hook `useStages` existente (sem pipelineId) já retorna os estágios de todas as pipelines com seu `pipeline_id`. Podemos fazer a filtragem no front-end cruzando os dados.

### Arquivos modificados

| Arquivo | O que muda |
|---|---|
| `src/components/crm-management/CadencesTab.tsx` | Adicionar Select de pipeline + lógica de filtragem |

Nenhum hook novo, nenhuma query nova — apenas usa hooks já existentes (`usePipelines`, `useStages`).
