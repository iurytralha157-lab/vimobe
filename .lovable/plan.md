

## Plano: Botão para Interromper Automações + Correção do Stop on Reply

### Diagnóstico do Problema

**Problema 1: Falta de botão para interromper manualmente**
- O componente `ExecutionHistory.tsx` exibe automações em andamento, mas não oferece opção para cancelá-las pela interface.

**Problema 2: Stop on Reply não funciona em alguns casos**
- A função `handleStopFollowUpOnReply` no webhook só é chamada quando `conversation.lead_id` existe.
- Quando um lead responde, a conversa pode não estar vinculada ao lead porque:
  - O lead foi criado sem vincular à conversa original
  - A conversa foi criada antes do lead existir
- A busca por telefone já está implementada (linhas 639-675), mas pode falhar devido a formatos inconsistentes de telefone.

### Solução Proposta

---

### Parte 1: Botão de Interromper Execução

**Arquivo: `src/components/automations/ExecutionHistory.tsx`**

Adicionar botão "Interromper" para execuções com status `running` ou `waiting`:

```text
┌─────────────────────────────────────────────────┐
│ Lead Fulano        ⏳ Aguardando    [Interromper]│
│ Follow-up 10 Dias                               │
│ Iniciado há 2 horas • Próximo: em 22 horas      │
└─────────────────────────────────────────────────┘
```

**Alterações:**
1. Criar novo hook `useCancelExecution` em `use-automations.ts`
2. Adicionar botão com ícone `StopCircle` no `ExecutionRow`
3. Confirmar ação com AlertDialog antes de cancelar

---

### Parte 2: Correção da Lógica Stop on Reply

**Arquivo: `supabase/functions/evolution-webhook/index.ts`**

O problema está na busca por telefone. A função já busca o lead por telefone, mas pode falhar se:
- O telefone do lead tem 9º dígito e a conversa não tem
- Formatos diferentes (com/sem 55, com/sem 9)

**Correção:**
Melhorar a busca por telefone para incluir mais variações:

```typescript
// Antes: apenas 2 variações
const phoneVariants = [
  contactPhone,                    // 5522974063727
  contactPhone.replace(/^55/, ''), // 22974063727
];

// Depois: 6+ variações para cobrir todos os casos
const basePhone = contactPhone.replace(/^55/, '');
const phoneVariants = [
  contactPhone,                           // 5522974063727
  basePhone,                              // 22974063727
  `55${basePhone}`,                       // 5522974063727
  // Variações com/sem 9º dígito
  basePhone.replace(/^(\d{2})9/, '$1'),   // 2297406372 (sem 9)
  basePhone.replace(/^(\d{2})(\d{8})$/, '$19$2'), // 22997406372 (com 9)
];
```

**Adicionar log detalhado:**
```typescript
console.log(`Searching for lead with phone variants: ${phoneVariants.join(', ')}`);
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-automations.ts` | Adicionar hook `useCancelExecution` |
| `src/components/automations/ExecutionHistory.tsx` | Botão de interromper + AlertDialog |
| `supabase/functions/evolution-webhook/index.ts` | Melhorar busca por telefone no stop on reply |

---

### Detalhes Técnicos

**Hook useCancelExecution:**
```typescript
export function useCancelExecution() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from('automation_executions')
        .update({ 
          status: 'cancelled', 
          completed_at: new Date().toISOString(),
          error_message: 'Cancelado manualmente pelo usuário'
        })
        .eq('id', executionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      toast.success('Automação interrompida!');
    },
  });
}
```

**Botão no ExecutionRow:**
```tsx
{(execution.status === 'running' || execution.status === 'waiting') && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm" className="text-destructive">
        <StopCircle className="h-4 w-4 mr-1" />
        Interromper
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Interromper automação?</AlertDialogTitle>
        <AlertDialogDescription>
          As mensagens pendentes não serão enviadas.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={() => cancelExecution.mutate(execution.id)}>
          Confirmar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

