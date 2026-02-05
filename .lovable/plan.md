
# Plano: Unificação dos Sistemas de Automação

## Diagnóstico

### 1. O Gatilho ESTÁ Funcionando!
Ao analisar os logs, confirmei que o trigger disparou corretamente:

```
21:06:20 - new_stage_id: b188d9fc-a897-489a-b797-5147dd2560f1 → DISPAROU!
         Created execution 45ea3fb2-bc69-4934-b804-06d967fca5f4
```

O erro foi no envio do WhatsApp - o número do lead não existe:
```
{"jid":"22974063727@s.whatsapp.net","exists":false,"number":"22974063727"}
```

**Solução:** O número do lead usado no teste não está cadastrado no WhatsApp. Use um lead com número válido.

---

### 2. Problema de Confusão entre Sistemas

Existem **dois editores de automação completamente diferentes**:

| Aspecto | Follow-up Builder (MELHOR) | Automation Editor (ANTIGO) |
|---------|---------------------------|---------------------------|
| Arquivo | `FollowUpBuilder.tsx` | `AutomationEditor.tsx` |
| Estilo | Editor visual moderno (n8n-like) | Editor antigo mais básico |
| Nós | StartNode, MessageNode, WaitNode | TriggerNode, ActionNode, ConditionNode, DelayNode |
| Seletor de etapa | Pipeline → Etapa (hierárquico) | Apenas etapa (sem pipeline) |
| Filtro por usuário | Sim | Não |
| Parar ao responder | Sim | Não |

Quando você cria via **Follow-up**, usa o editor visual bonito.
Quando você clica em "Nova Automação" ou "Editar" na lista, abre o editor **antigo**.

---

## Solução: Unificar em Um Só Sistema

### Nova Estrutura Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│ AUTOMAÇÕES (página)                                             │
├─────────────────────────────────────────────────────────────────┤
│ [Modelos] [Minhas Automações] [Histórico]                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ABA "MODELOS" (antiga Follow-up Templates)                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │ + Criar do  │ │ Follow-up   │ │ Follow-up   │ │ Follow-up   ││
│ │   Zero      │ │ 3 Dias      │ │ 6 Dias      │ │ 10 Dias     ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                 │
│ ABA "MINHAS AUTOMAÇÕES" (lista atual)                          │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Follow-up 3 Dias          [Ativa] [Editar] [Excluir]        ││
│ │ Boas-vindas Lead          [Inativa] [Editar] [Excluir]      ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ABA "HISTÓRICO" (execuções)                                    │
│ └─ Igual ao atual                                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ EDITOR VISUAL (usa FollowUpBuilder para TUDO)                   │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [←] Nome da Automação                          [Salvar]     ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ ┌─────────┐  ┌─────────────────────────────────┐  ┌───────┐││
│ │ │ Config  │  │        CANVAS VISUAL            │  │ Painel│││
│ │ │ Lateral │  │   [Start] → [Msg] → [Wait]...   │  │ Editor│││
│ │ │         │  │                                 │  │       │││
│ │ └─────────┘  └─────────────────────────────────┘  └───────┘││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Renomear Abas na Página

**Arquivo:** `src/pages/Automations.tsx`

```typescript
// Antes:
<TabsTrigger value="automations">Automações</TabsTrigger>
<TabsTrigger value="followup">Follow-up</TabsTrigger>
<TabsTrigger value="history">Histórico</TabsTrigger>

// Depois:
<TabsTrigger value="templates">Modelos</TabsTrigger>
<TabsTrigger value="automations">Minhas Automações</TabsTrigger>
<TabsTrigger value="history">Histórico</TabsTrigger>
```

### 2. Usar FollowUpBuilder para Editar QUALQUER automação

**Arquivo:** `src/pages/Automations.tsx`

Modificar `handleEditAutomation` para abrir o FollowUpBuilder (editor visual) em vez do AutomationEditor antigo:

```typescript
// Criar novo modo: 'edit-existing'
const handleEditAutomation = (automationId: string) => {
  setEditingAutomationId(automationId);
  setViewMode('edit-existing'); // Nova view que carrega automação existente
};

// No render, usar FollowUpBuilder para editar também
if (viewMode === 'edit-existing' && editingAutomationId) {
  return (
    <AppLayout title={undefined}>
      <FollowUpBuilderEdit 
        automationId={editingAutomationId}
        onBack={handleBack}
        onComplete={handleFollowUpComplete}
      />
    </AppLayout>
  );
}
```

### 3. Criar Componente FollowUpBuilderEdit

**Novo arquivo:** `src/components/automations/FollowUpBuilderEdit.tsx`

Variante do FollowUpBuilder que:
- Recebe `automationId` como prop
- Carrega dados existentes da automação via `useAutomation(automationId)`
- Preenche os estados com os valores salvos
- Salva atualizações em vez de criar novo

### 4. Remover Componentes Obsoletos (ou manter como backup)

Arquivos que podem ser removidos após migração:
- `src/components/automations/AutomationEditor.tsx` (editor antigo)
- `src/components/automations/CreateAutomationDialog.tsx` (dialog antigo)
- `src/components/automations/nodes/TriggerNode.tsx` (nó do editor antigo)
- `src/components/automations/nodes/ActionNode.tsx`
- `src/components/automations/nodes/ConditionNode.tsx`
- `src/components/automations/nodes/DelayNode.tsx`

### 5. Atualizar AutomationList

**Arquivo:** `src/components/automations/AutomationList.tsx`

- Remover botão "Nova Automação" (criação agora é pela aba Modelos)
- Manter apenas lista de automações existentes
- Editar abre o novo editor visual

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `src/pages/Automations.tsx` | Renomear abas, unificar fluxo de edição |
| `src/components/automations/FollowUpBuilderEdit.tsx` | CRIAR - Versão do builder para editar automação existente |
| `src/components/automations/FollowUpBuilder.tsx` | Ajustar para aceitar modo edição |
| `src/components/automations/AutomationList.tsx` | Remover "Nova Automação", editar usa novo editor |
| `src/components/automations/FollowUpTemplates.tsx` | Manter como biblioteca de modelos |

---

## Resultado Final

1. **Modelos** → Biblioteca de templates prontos + "Criar do Zero"
2. **Minhas Automações** → Lista de automações criadas (editar abre editor visual)
3. **Histórico** → Logs de execução

**Um só editor visual** para criar E editar, eliminando a confusão entre sistemas!
