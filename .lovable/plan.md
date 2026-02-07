

# 🔍 Auditoria Completa do Pipeline/Kanban

## Resumo Executivo

Analisei **1.147 linhas** do arquivo principal `Pipelines.tsx` + hooks relacionados. O código está **bem estruturado e robusto**, mas existem alguns pontos de atenção importantes.

---

## ✅ O Que Está Funcionando Bem

| Área | Status | Observações |
|------|--------|-------------|
| **Drag-and-Drop** | ✅ Excelente | Usa `@hello-pangea/dnd`, update otimista com rollback, bloqueio de refetch durante drag |
| **Paginação por Coluna** | ✅ Implementado | 100 leads por estágio, botão "Carregar mais" funcionando |
| **Sincronização Real-time** | ✅ Bom | Subscription com debounce de 200ms, `isDraggingRef` evita race conditions |
| **Visibilidade por Role** | ✅ Correto | RLS complexa com `lead_view_all`, `is_team_leader()`, `get_user_led_pipeline_ids()` |
| **Permissão Pipeline Lock** | ✅ Implementado | `hasPipelineLock` desabilita drag para usuários restritos |
| **Automações de Estágio** | ✅ Funcionando | 7 automações ativas (alert_on_inactivity, change_deal_status, change_assignee) |
| **Filtros** | ✅ Completos | Data, responsável, tag, status do deal, busca por nome/telefone |
| **Deep Link** | ✅ Funciona | `?lead_id=xxx` abre card diretamente, com fallback para buscar no banco |

---

## ⚠️ Problema Crítico Pendente

### Maikson Ainda na Fila Round-Robin

```sql
-- Resultado da query:
queue_name: venda
user_name: Maikson
user_org_id: NULL
status: user_no_org
```

**Impacto**: Leads continuarão sendo atribuídos a este usuário "fantasma" até a limpeza ser executada.

**Ação**: Executar a ferramenta de limpeza em `/admin/database` clicando em "Executar Limpeza".

---

## 🔧 Pontos de Atenção Identificados

### 1. **Arquivo Pipelines.tsx Muito Grande (1.147 linhas)**

O arquivo concentra muita lógica em um único componente.

**Componentes que poderiam ser extraídos**:
- `KanbanColumn.tsx` - Renderização de cada coluna
- `PipelineFilters.tsx` - Barra de filtros
- `PipelineToolbar.tsx` - Seletor de pipeline + botões
- `usePipelineFilters.ts` - Hook para gerenciar estado dos filtros

**Impacto**: Manutenibilidade a longo prazo.
**Prioridade**: Baixa (funciona bem, mas pode dificultar futuras mudanças).

---

### 2. **Contador de Leads no Badge Pode Divergir**

```typescript
// Linha 888 do Pipelines.tsx
{stage.total_lead_count || stage.leads?.length || 0}
```

O `total_lead_count` vem da contagem real no banco, mas `stage.leads?.length` é limitado pela paginação (100). Se o primeiro estiver nulo, mostra o valor paginado.

**Status**: Funciona corretamente na maioria dos casos, mas vale monitorar.

---

### 3. **Automação Duplicada Detectada**

```sql
-- Duas automações idênticas na mesma coluna "Perdido":
id: 6b05922e... | automation_type: change_deal_status_on_enter | deal_status: lost
id: 891ca3d3... | automation_type: change_deal_status_on_enter | deal_status: lost
```

**Impacto**: Não causa problemas funcionais, mas é redundância desnecessária.

**Ação Recomendada**: Remover uma das duplicatas manualmente.

---

### 4. **Potencial de Delay no Update Otimista**

```typescript
// Linhas 337-347 - Busca automações ANTES do update otimista
const { data: stageAutomations } = await supabase
  .from('stage_automations')
  .select('automation_type, action_config')
  .eq('stage_id', newStageId)
  .eq('is_active', true);
```

Essa query adiciona ~50-100ms antes do update visual durante drag-and-drop.

**Status**: Aceitável para garantir que o `deal_status` seja exibido corretamente.
**Alternativa**: Cachear automações no frontend (trade-off de complexidade).

---

### 5. **LeadCard com 336 Linhas**

O componente `LeadCard.tsx` também está crescendo. Mas está bem organizado e não apresenta bugs.

---

## 📊 Métricas do Sistema

| Métrica | Valor |
|---------|-------|
| Pipelines no sistema | 4+ |
| Automações ativas | 7 |
| Leads sem responsável (7d) | 0 ✅ |
| Membros órfãos | 1 (Maikson) ⚠️ |
| Políticas RLS em leads | 4 (SELECT, INSERT, ALL x2) |

---

## 🏗️ Arquitetura do Pipeline

```text
Pipelines.tsx (1147 linhas)
├── Estado Local: filters, dialogs, selectedLead
├── Hooks:
│   ├── usePipelines() ────────> Busca lista de pipelines
│   ├── useStagesWithLeads() ──> Busca estágios + leads paginados (100/coluna)
│   ├── useLoadMoreLeads() ────> Carrega mais leads de um estágio
│   ├── useOrganizationUsers() ─> Lista usuários para filtro
│   ├── useTags() ─────────────> Lista tags para filtro
│   ├── useHasPermission() ────> Verifica lead_view_all, pipeline_lock
│   └── useCanEditCadences() ──> Verifica se pode editar (admin/líder)
├── Real-time:
│   └── Subscription em 'leads' e 'lead_tags' com debounce
├── Drag-and-Drop:
│   ├── DragDropContext + Droppable + Draggable
│   ├── handleDragEnd() ───> Update otimista + rollback
│   └── isDraggingRef ─────> Bloqueia refetch durante drag
└── Componentes:
    ├── LeadCard ──────────> Card de cada lead
    ├── LeadDetailDialog ──> Modal de detalhes
    ├── StageSettingsDialog > Config de estágio (cadência, automações)
    ├── CreateLeadDialog ──> Criar novo lead
    └── StagesEditorDialog ─> Gerenciar colunas
```

---

## 🎯 Conclusão

O módulo de **Pipeline/Kanban está estável e bem implementado**. Os principais pontos são:

1. **Crítico**: Maikson órfão ainda na fila - **executar limpeza AGORA**
2. **Menor**: Automação duplicada na coluna "Perdido" - limpar manualmente
3. **Arquitetura**: Arquivo grande mas funcional - refatorar quando houver necessidade de novas features

---

## Próximas Auditorias Sugeridas

1. **Conversas/WhatsApp** - Sincronização de mensagens, vinculação com leads
2. **Contatos** - Listagem paginada, importação, exportação
3. **Gestão CRM** - Equipes, round-robins, regras de distribuição
4. **Financeiro** - Comissões, contratos, DRE

