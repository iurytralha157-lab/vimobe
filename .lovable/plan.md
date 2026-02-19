
# Correções no Hook use-lead-history — Deduplicação e Labels Faltantes

## Problemas encontrados na análise

### 1. Duplicata: `assignee_changed` (activity) + `lead_assigned` (timeline)
O banco confirma que esses eventos ocorrem no mesmo timestamp (diff < 5s) para os mesmos leads. O hook atual deduplica `lead_assigned` via `TIMELINE_AUTHORITY_TYPES`, mas o par activity `assignee_changed` **não é mapeado** — só `lead_assigned` é listado no set. Resultado: ambos aparecem na timeline.

**Correção**: Adicionar `assignee_changed` ao `TIMELINE_AUTHORITY_TYPES` para que quando `lead_assigned` existir na timeline, o `assignee_changed` da activity seja descartado.

### 2. Tipo `status_change` sem label
Activities com `type = 'status_change'` existem no banco (73 registros) representando mudanças de status (open/won/lost), mas o `buildLabel` não tem case para ele e retorna o tipo cru `"status change"`. 

**Correção**: Adicionar case `status_change` em `buildLabel` com label `"Status alterado: {from} → {to}"`.

### 3. Tipo `whatsapp` sem label
31 registros de activities com `type = 'whatsapp'` que não têm label definido — apareceria como `"whatsapp"` na tela.

**Correção**: Adicionar case `whatsapp` em `buildLabel` e no ícone/cor do componente.

### 4. Tipo `assignment` sem label
18 registros de activities com `type = 'assignment'` — aparece como `"assignment"`.

**Correção**: Adicionar case `assignment` mapeando para label de atribuição.

## Arquivo afetado: `src/hooks/use-lead-history.ts`

### Mudança 1 — TIMELINE_AUTHORITY_TYPES
Adicionar `assignee_changed` ao set:
```ts
const TIMELINE_AUTHORITY_TYPES = new Set([
  ...
  'assignee_changed',  // ← ADD: deduplica com lead_assigned da timeline
]);
```

### Mudança 2 — buildLabel: novos cases
```ts
case 'status_change': {
  const from = metadata?.from_status;
  const to = metadata?.to_status;
  const statusMap: Record<string, string> = { open: 'Aberto', won: 'Ganho', lost: 'Perdido' };
  if (from && to) return `Status: ${statusMap[from] || from} → ${statusMap[to] || to}`;
  return 'Status alterado';
}
case 'whatsapp':
  return 'Mensagem WhatsApp';
case 'assignment':
  return metadata?.to_user_name ? `Atribuído a ${metadata.to_user_name}` : 'Lead atribuído';
```

## Arquivo afetado: `src/components/leads/LeadHistory.tsx`

### Mudança 1 — getEventIcon: novos tipos
```ts
status_change:  ArrowRight,
whatsapp:       MessageSquare,
assignment:     UserCheck,
```

### Mudança 2 — getEventColors: novos tipos
```ts
status_change: { text: 'text-muted-foreground', bg: 'bg-muted' },
whatsapp:      { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/15' },
assignment:    { text: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/15' },
```

## Resumo das mudanças

| Problema | Impacto | Correção |
|---|---|---|
| `assignee_changed` duplica `lead_assigned` | 2 linhas p/ mesma ação | Adicionar ao `TIMELINE_AUTHORITY_TYPES` |
| `status_change` sem label | Aparece como texto cru | Novo case em `buildLabel` |
| `whatsapp` sem label/ícone | Aparece como `"whatsapp"` | Novo case + ícone + cor |
| `assignment` sem label/ícone | Aparece como `"assignment"` | Novo case + ícone + cor |

## Arquivos a editar
- `src/hooks/use-lead-history.ts` — 2 seções (TIMELINE_AUTHORITY_TYPES + buildLabel)
- `src/components/leads/LeadHistory.tsx` — 2 seções (iconMap + colorMap)
