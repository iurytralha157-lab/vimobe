
# Registrar `first_response` ao criar atividade manualmente

## Diagnóstico preciso

O usuário está correto: os **botões rápidos** (telefone, WhatsApp, e-mail no topo do lead) chamam `recordFirstResponse` corretamente — mas o fluxo de **completar uma tarefa de cadência** (`handleToggleCadenceTask` / `handleOutcomeConfirm`) e o fluxo de **confirmar desfecho dos botões rápidos** (`handleQuickActionOutcomeConfirm`) **não chamam** `recordFirstResponse`.

### Fluxo atual dos botões rápidos (funciona)

```
Usuário clica em Telefone
→ handleQuickPhone()
    → recordFirstResponse({ channel: 'phone' })   ✅
    → abre TaskOutcomeDialog
→ Usuário confirma desfecho
    → handleQuickActionOutcomeConfirm()
        → createActivityMutation.mutate(...)       ✅
        // MAS o recordFirstResponse já foi chamado antes ✅
```

### Fluxo de completar tarefa de cadência (faltando)

```
Usuário clica em uma tarefa de cadência (ex: Ligação, Mensagem)
→ handleCadenceTaskClick(task)
    → setTaskForOutcome(task) + abre TaskOutcomeDialog
→ Usuário confirma
    → handleOutcomeConfirm()
        → handleToggleCadenceTask(task, outcome, notes)
            → completeCadenceTask.mutateAsync(...)  ✅
            // recordFirstResponse nunca é chamado    ❌
```

### `handleRoteiroAction` (também faltando)

Quando o usuário executa uma ação via roteiro (script de mensagem), `handleRoteiroAction('complete')` completa a tarefa mas também não chama `recordFirstResponse`.

---

## Solução

Adicionar `recordFirstResponse` nos dois pontos ausentes dentro de `LeadDetailDialog.tsx`:

### Ponto 1 — `handleToggleCadenceTask` (linha ~373)

Após o `completeCadenceTask.mutateAsync`, adicionar:

```ts
const handleToggleCadenceTask = async (task: any, outcome?: string, outcomeNotes?: string) => {
  await completeCadenceTask.mutateAsync({ ... });
  
  // Registrar first response ao concluir tarefa (se ainda não foi registrado)
  const channel = task.type === 'call' ? 'phone'
    : task.type === 'email' ? 'email'
    : task.type === 'message' ? 'whatsapp'
    : 'stage_move';
  
  await recordFirstResponse({
    leadId: lead.id,
    organizationId: lead.organization_id || profile?.organization_id || '',
    channel,
    actorUserId: profile?.id || null,
    firstResponseAt: lead.first_response_at,
  });
};
```

### Ponto 2 — `handleRoteiroAction` (linha ~430)

Quando `action === 'complete'`, adicionar `recordFirstResponse` antes de fechar o dialog:

```ts
const handleRoteiroAction = (action: 'complete' | 'message') => {
  if (action === 'complete') {
    // ... lógica existente ...
    recordFirstResponse({
      leadId: lead.id,
      organizationId: lead.organization_id || profile?.organization_id || '',
      channel: selectedTask?.type === 'call' ? 'phone' : 'whatsapp',
      actorUserId: profile?.id || null,
      firstResponseAt: lead.first_response_at,
    });
  }
  // ...
};
```

---

## Mapeamento de `task.type` → canal de first_response

| Tipo da tarefa | Canal enviado |
|---|---|
| `call` | `phone` |
| `email` | `email` |
| `message` | `whatsapp` |
| `note` | `stage_move` (genérico) |
| outros | `stage_move` (genérico) |

---

## Arquivo afetado

- `src/components/leads/LeadDetailDialog.tsx`
  - **`handleToggleCadenceTask`**: adicionar `recordFirstResponse` após `completeCadenceTask.mutateAsync`
  - **`handleRoteiroAction`**: adicionar `recordFirstResponse` quando `action === 'complete'`

> **Idempotência garantida**: `recordFirstResponse` já verifica `firstResponseAt` antes de chamar a edge function — se o lead já tiver tempo de resposta registrado, a chamada é ignorada sem efeito colateral.
