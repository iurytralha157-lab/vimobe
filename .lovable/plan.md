
# Corrigir Duplicação do Tempo de Resposta no Histórico

## Problema identificado

No `LeadHistory.tsx`, o evento `first_response` está sendo exibido em dois lugares ao mesmo tempo:

1. **Banner amarelo no topo** (linha 177-198) — exibe o tempo de resposta de forma destacada
2. **Item na timeline** (linha 202-340) — o mesmo evento aparece como item normal na lista

O usuário disse "só pode ter um tempo de resposta", o que confirma que está vendo os dois.

## Solução

No loop `events.map(...)`, pular (retornar `null`) quando `event.type === 'first_response'`, já que ele já é representado pelo banner. Só uma linha de mudança.

### `src/components/leads/LeadHistory.tsx` — linha 207

```tsx
// ANTES: a variável isFirstResponse existe mas não é usada para filtrar
const isFirstResponse = event.type === 'first_response';

// ADICIONAR logo após:
if (isFirstResponse) return null;
```

Ou alternativamente, filtrar antes do map:

```tsx
{events
  .filter(e => e.type !== 'first_response')   // ← ADD: já exibido no banner
  .map((event, index) => {
```

Vou usar o `.filter()` antes do `.map()` pois é mais limpo — evita retornar `null` dentro do map e também corrige o cálculo do `isLastEvent` (que ficaria errado se houvesse `null` no array).

## Arquivo afetado

- `src/components/leads/LeadHistory.tsx` — 1 linha: adicionar `.filter(e => e.type !== 'first_response')` antes do `.map()`
