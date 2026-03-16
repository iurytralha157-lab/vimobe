

# Melhoria do Design e Arquitetura JSON das Automacoes

## Contexto

A pagina de Automacoes esta visualmente diferente do resto do sistema (Dashboard, Pipelines, etc). Atualmente usa tabs simples e cards basicos. Alem disso, o fluxo atual salva nodes/connections em tabelas separadas no banco. A ideia e adotar um modelo JSON (como n8n) onde todo o fluxo fica em um unico campo JSONB na tabela `automations`, simplificando leitura, escrita e versionamento.

## O que muda

### 1. Novo campo JSONB na tabela `automations`

Adicionar coluna `flow_definition jsonb` na tabela `automations`. Esse campo armazena todo o fluxo em um unico JSON:

```text
{
  "nodes": [
    { "id": "start-1", "type": "trigger", "position": {...}, "config": {...} },
    { "id": "msg-1", "type": "message", "position": {...}, "config": { "message": "...", "day": 1 } },
    { "id": "wait-1", "type": "wait", "position": {...}, "config": { "wait_type": "days", "wait_value": 1 } }
  ],
  "connections": [
    { "source": "start-1", "target": "msg-1" },
    { "source": "msg-1", "target": "wait-1" }
  ],
  "settings": {
    "session_id": "...",
    "stop_on_reply": true,
    "on_reply_message": "...",
    "on_reply_stage_id": "..."
  }
}
```

As tabelas `automation_nodes` e `automation_connections` continuam existindo para retrocompatibilidade, mas novas automacoes gravam tudo no `flow_definition`. O hook de save/load prioriza `flow_definition` quando presente.

### 2. Redesign visual da pagina Automacoes

Alinhar com o estilo do resto do app (glassmorphism, fundo escuro `#1f1f1f`, accent `#ff482a`, `rounded-2xl`):

**Header da pagina:**
- Hero section com gradiente sutil, titulo "Automacoes" com contagem e botao "Nova Automacao" proeminente

**Lista de automacoes (tab principal):**
- Cards com glassmorphism (`bg-card/50 backdrop-blur border border-border/50 rounded-2xl`)
- Icone do gatilho com fundo colorido, nome, badge de status (Ativa/Inativa com cores), stats inline
- Switch de ativar/desativar integrado no card
- Hover revela acoes (editar, historico, excluir)
- Indicadores visuais de execucao (dot pulsante quando running)

**Templates (tab modelos):**
- Grid de cards com hover effect e gradiente no icone
- Botao "Criar do Zero" como card especial com borda tracejada e icone `+`
- Tags de industria (Imobiliario, Telecom, Geral)

**Historico:**
- Timeline vertical com icones de status coloridos
- Cards expansiveis com detalhes da execucao

### 3. Refatorar hooks para suportar JSON

**`use-automations.ts`:**
- `useSaveAutomationFlow`: ao salvar, grava `flow_definition` JSONB na tabela `automations` (unico update) em vez de deletar/reinserir em `automation_nodes` e `automation_connections`
- `useAutomation`: ao carregar, se `flow_definition` existe, usa ele; senao, faz fallback para as tabelas separadas (retrocompatibilidade)
- Menos queries, menos latencia, atomicidade garantida

**`FollowUpBuilder.tsx` e `FollowUpBuilderEdit.tsx`:**
- Salvar: serializa nodes/edges do ReactFlow para o JSON e chama um unico `update` na tabela `automations`
- Carregar: deserializa `flow_definition` para nodes/edges do ReactFlow

### 4. Migration SQL

```text
ALTER TABLE automations ADD COLUMN flow_definition jsonb;
```

Migrar dados existentes das tabelas de nodes/connections para o campo JSONB (script de migracao dentro da mesma migration).

## Etapas de execucao

1. **Migration**: adicionar `flow_definition jsonb` em `automations` + migrar dados existentes
2. **Hook `use-automations.ts`**: refatorar `useSaveAutomationFlow` e `useAutomation` para ler/gravar JSON
3. **Redesign `Automations.tsx`**: novo layout com header hero, visual consistente
4. **Redesign `AutomationList.tsx`**: cards com glassmorphism, stats inline, hover actions
5. **Redesign `FollowUpTemplates.tsx`**: grid refinado com card "criar do zero" especial
6. **Redesign `ExecutionHistory.tsx`**: timeline visual com cards expansiveis
7. **Atualizar `FollowUpBuilder.tsx` e `FollowUpBuilderEdit.tsx`**: serializar/deserializar `flow_definition`

## Beneficios do JSON

- **Performance**: 1 query em vez de 3 (automacao + nodes + connections)
- **Atomicidade**: salvar e um unico UPDATE, sem risco de estado inconsistente
- **Versionamento**: facil comparar versoes, fazer undo/redo, duplicar automacoes
- **Export/Import**: usuario pode exportar/importar automacoes como JSON
- **Compatibilidade**: mesmo modelo mental do n8n, facilita integracao futura

