
# Plano: Corrigir Regras de Entrada e Exclusão de Distribuições

## Problemas Identificados

### 1. Falta a opção "Webhook" nas fontes
No arquivo `src/components/round-robin/RuleEditor.tsx`, a lista de fontes disponíveis não inclui "webhook":
```typescript
const SOURCES = [
  { value: 'meta', label: 'Meta Ads' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
];
// Falta: { value: 'webhook', label: 'Webhook' }
```

### 2. Erro ao excluir distribuições (Round Robin)
A constraint de foreign key na tabela `assignments_log` não permite exclusão:
- `assignments_log_round_robin_id_fkey` referencia `round_robins(id)` **sem** `ON DELETE CASCADE` ou `ON DELETE SET NULL`
- Quando tenta excluir uma roleta que já distribuiu leads, o banco bloqueia

---

## Solução Proposta

### Parte 1: Adicionar "Webhook" às fontes

**Arquivo:** `src/components/round-robin/RuleEditor.tsx`

Adicionar a opção "Webhook" à lista de fontes:
```typescript
const SOURCES = [
  { value: 'meta', label: 'Meta Ads' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
  { value: 'webhook', label: 'Webhook' },  // Nova opção
];
```

### Parte 2: Corrigir exclusão de Round Robins

**Migração SQL:**

Atualizar a foreign key para usar `ON DELETE SET NULL`, preservando o histórico de atribuições mas permitindo exclusão das filas:

```sql
-- Remover constraint existente
ALTER TABLE public.assignments_log 
DROP CONSTRAINT IF EXISTS assignments_log_round_robin_id_fkey;

-- Recriar com ON DELETE SET NULL (preserva histórico)
ALTER TABLE public.assignments_log 
ADD CONSTRAINT assignments_log_round_robin_id_fkey 
FOREIGN KEY (round_robin_id) REFERENCES public.round_robins(id) 
ON DELETE SET NULL;
```

**Por que `SET NULL` em vez de `CASCADE`?**
- O histórico de atribuições (`assignments_log`) é importante para auditoria
- Ao excluir uma fila, os registros de atribuição continuam existindo, mas com `round_robin_id = NULL`
- Isso indica que a fila foi excluída, mas mantém o histórico de qual usuário recebeu qual lead

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/round-robin/RuleEditor.tsx` | Adicionar "webhook" à lista de fontes |
| Nova migração SQL | Corrigir foreign key do `assignments_log` |

---

## Resultado Esperado

1. ✅ A opção "Webhook" aparecerá nas regras de entrada de distribuição
2. ✅ Será possível excluir filas de distribuição mesmo que já tenham distribuído leads
3. ✅ O histórico de atribuições será preservado para auditoria
