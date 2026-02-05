
# Plano: Unificação dos Sistemas de Automação

## ✅ IMPLEMENTADO

### Mudanças Realizadas

1. **Renomeadas as abas na página Automações:**
   - "Automações" → "Modelos" (templates prontos)
   - "Follow-up" → "Minhas Automações" (lista de automações)
   - "Histórico" permanece igual

2. **Criado `FollowUpBuilderEdit.tsx`:**
   - Novo componente para editar automações existentes
   - Carrega dados da automação via `useAutomation(automationId)`
   - Usa o mesmo editor visual moderno (ReactFlow)
   - Salva atualizações em vez de criar nova automação

3. **Atualizado `AutomationList.tsx`:**
   - Removido botão "Nova Automação" (criação via aba Modelos)
   - Editar abre o novo editor visual (`FollowUpBuilderEdit`)

4. **Removidos componentes obsoletos:**
   - `AutomationEditor.tsx` (editor antigo)
   - `CreateAutomationDialog.tsx` (dialog antigo)
   - `NodeConfigPanel.tsx`
   - `AddNodeDialog.tsx`
   - `nodes/TriggerNode.tsx`
   - `nodes/ActionNode.tsx`
   - `nodes/ConditionNode.tsx`
   - `nodes/DelayNode.tsx`

5. **Atualizado `index.ts` de exports:**
   - Exporta apenas componentes em uso

---

## Fluxo Atual

```text
┌─────────────────────────────────────────────────────────────────┐
│ AUTOMAÇÕES (página)                                             │
├─────────────────────────────────────────────────────────────────┤
│ [Modelos] [Minhas Automações] [Histórico]                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ABA "MODELOS"                                                   │
│ - Templates prontos (3, 6, 10 dias)                             │
│ - Botão "Criar do Zero"                                         │
│ → Abre FollowUpBuilder (criar nova)                             │
│                                                                 │
│ ABA "MINHAS AUTOMAÇÕES"                                         │
│ - Lista de automações existentes                                │
│ - Switch ativo/inativo                                          │
│ - Botão "Editar" → Abre FollowUpBuilderEdit                     │
│ - Botão "Excluir"                                               │
│                                                                 │
│ ABA "HISTÓRICO"                                                 │
│ - Logs de execução                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Um só editor visual** para criar E editar, eliminando a confusão entre sistemas!
