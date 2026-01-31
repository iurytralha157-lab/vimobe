# Plano: Ajustar Histórico do Lead e Garantir Responsável

## ✅ IMPLEMENTADO

### Resumo das Mudanças Realizadas

1. **Aba Atividades** - Removida seção "Atividades recentes" (desktop e mobile), deixando apenas "Próximas atividades" (cadência)

2. **Histórico com Labels Dinâmicas** - Atualizado `use-lead-full-history.ts`:
   - "Lead criado via webhook [Nome]"
   - "Distribuído por [Fila] → [Responsável]"
   - "Redistribuído por [Fila] → [Novo Responsável]"
   - "Lead reentrou via webhook [Nome]"
   - "Lead continua com [Responsável] (configuração da fila)"

3. **Migration SQL** - Adicionado:
   - Coluna `reentry_behavior` na tabela `round_robins` (valores: 'redistribute' | 'keep_assignee')
   - RPC `handle_lead_intake` atualizada para registrar activities com nome da fila

4. **Generic Webhook** - Atualizado:
   - Verifica configuração `reentry_behavior` da fila antes de decidir ação
   - Se `keep_assignee`: mantém responsável anterior
   - Se `redistribute`: chama `handle_lead_intake` para redistribuir
   - Sempre garante que lead tenha responsável (fallback para responsável anterior)

5. **UI de Configuração** - Adicionado toggle em "Configurações Avançadas" do editor de filas:
   - "Manter responsável em reentradas?"
   - Descrição dinâmica baseada na opção selecionada

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/leads/LeadDetailDialog.tsx` | Removidas seções "Atividades recentes" |
| `src/hooks/use-lead-full-history.ts` | Labels dinâmicas baseadas em metadados |
| `supabase/functions/generic-webhook/index.ts` | Lógica de reentry com verificação de config |
| `src/components/round-robin/DistributionQueueEditor.tsx` | Toggle de comportamento de reentrada |
| `src/hooks/use-create-queue-advanced.ts` | Salva `reentry_behavior` |
| `src/hooks/use-round-robins.ts` | Tipo atualizado |
| **Migration SQL** | `reentry_behavior` + RPC atualizada |

---

## Fluxos Funcionando

### Lead novo via webhook
```
1. Webhook recebe lead
2. Activity: "Lead criado via webhook [Nome]"
3. handle_lead_intake chamado
4. Activity: "Distribuído por [Fila] → [Responsável]"
```

### Lead reentrou (config: redistribuir)
```
1. Webhook detecta telefone existente
2. Activity: "Lead reentrou via webhook [Nome]"
3. handle_lead_intake chamado
4. Activity: "Redistribuído por [Fila] → [Novo Responsável]"
```

### Lead reentrou (config: manter responsável)
```
1. Webhook detecta telefone existente
2. Activity: "Lead reentrou via webhook [Nome]"
3. Activity: "Lead continua com [Responsável] (configuração da fila)"
```
