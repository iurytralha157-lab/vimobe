
# Verificação e Correções Finais do Histórico do Lead

## Resultado da Inspeção Visual e de Dados

### O que está funcionando corretamente
- Filtro do `first_response` no timeline (banner amarelo exibe apenas uma vez)
- Labels traduzidos para `status_change`, `whatsapp`, `assignment`
- Deduplicação entre `assignee_changed` (activity) e `lead_assigned` (timeline) quando ambos existem
- Ícones e cores por tipo de evento
- Badge "Sistema" apenas para eventos sem ator humano

---

## Problemas identificados na inspeção

### Problema 1 — Bug no cálculo de `isLastEvent` (linha 205)

O `.filter()` remove o `first_response` antes do `.map()`, mas o cálculo do `isLastEvent` ainda usa `events.length` (tamanho original, sem filtrar):

```tsx
// ANTES (bugado):
const isLastEvent = index === events.length - 1;
// events.length inclui o first_response que foi filtrado fora
// Resultado: a linha de conexão não some no último item real
```

**Correção**: calcular o `isLastEvent` com base no array filtrado:

```tsx
const filteredEvents = events.filter(e => e.type !== 'first_response');
// ...
{filteredEvents.map((event, index) => {
  const isLastEvent = index === filteredEvents.length - 1;
```

---

### Problema 2 — Duplicatas nas próprias `activities` (no banco de dados)

A inspeção do banco revelou que há registros duplicados dentro da tabela `activities` com o mesmo `type`, mesmo `from_stage`/`to_stage` e timestamp com diferença de ~1 segundo. Isso acontece porque o sistema está gravando o evento duas vezes ao mover um lead.

Exemplos encontrados:
- `stage_change`: "Bacen → Não responde" aparece 2 vezes no mesmo segundo
- `assignee_changed`: "Raquel Fernandes" aparece 2 vezes no mesmo segundo

Isso precisa ser tratado no hook com deduplicação por fingerprint (tipo + to_stage + timestamp arredondado).

**Correção no hook** — após mapear as activities, aplicar deduplicação por chave composta:

```ts
// Gerar fingerprint por evento para detectar duplicatas internas
function getActivityFingerprint(a: any): string {
  const meta = a.metadata || {};
  const ts = Math.floor(new Date(a.created_at).getTime() / 2000); // janela de 2s
  const key = `${a.type}-${meta.to_stage || meta.to_user_id || ''}-${ts}`;
  return key;
}

// Aplicar deduplicação antes de mapear
const seen = new Set<string>();
const dedupedActivities = activityEvents.filter((a: any) => {
  const fp = getActivityFingerprint(a);
  if (seen.has(fp)) return false;
  seen.add(fp);
  return true;
});
```

---

### Problema 3 — `lead_created` pode aparecer tanto na timeline quanto nas activities

Nos dados verificados, o lead `7533bd28` tem:
- **Timeline**: `lead_created` (source: webhook)
- **Activities**: `lead_created` (source: webhook, com webhook_name: "Lp 001")

A activity tem mais informação (webhook_name), mas a timeline está sendo priorizada pelo `TIMELINE_AUTHORITY_TYPES`. Resultado: o usuário vê "Lead criado via Webhook" sem o nome do webhook quando a timeline é a fonte.

**Correção no buildLabel**: quando o timeline event for `lead_created` via webhook, buscar o `webhook_name` da activity correspondente — ou, alternativamente, incluir o `webhook_name` no metadata da timeline.

Solução mais simples: na query, quando o tipo for `lead_created` e a timeline não tiver `webhook_name` no metadata, mas a activity tiver, usar o nome da activity.

---

## Arquivos a editar

### `src/components/leads/LeadHistory.tsx`

**Correção 1** — Extrair o array filtrado antes do `.map()` para corrigir `isLastEvent`:

```tsx
// Extrair para variável antes
const filteredEvents = events.filter(e => e.type !== 'first_response');

// No JSX:
{filteredEvents.map((event, index) => {
  const isLastEvent = index === filteredEvents.length - 1;
  // ...
})}
```

### `src/hooks/use-lead-history.ts`

**Correção 2** — Deduplicação interna de activities (janela de 2 segundos):

Adicionar função `getActivityFingerprint` e aplicar `.filter()` sobre `activityEvents` antes de processar.

**Correção 3** — `lead_created` na timeline pode herdar `webhook_name` da activity correspondente:

Após montar o `timelineMapped`, se o evento `lead_created` não tiver `webhook_name` no metadata, buscar na `activityMapped` correspondente.

---

## Resumo das mudanças

| Problema | Impacto visual | Correção |
|---|---|---|
| `isLastEvent` calculado com tamanho errado | Linha de conexão não desaparece no último item | Usar `filteredEvents.length` |
| Duplicatas internas em `activities` | stage_change aparece 2x seguidos | Deduplicação por fingerprint (janela 2s) |
| `lead_created` perde webhook_name | Exibe "via Webhook" sem nome | Herdar metadata da activity quando timeline não tem |

## Arquivos afetados
- `src/components/leads/LeadHistory.tsx` — 1 correção (isLastEvent)
- `src/hooks/use-lead-history.ts` — 2 correções (deduplicação + enrichment)
