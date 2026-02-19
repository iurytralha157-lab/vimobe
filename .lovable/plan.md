
# Separadores de Data no Histórico do Lead

## O que será feito

O componente `DateSeparator` (com as labels "Hoje", "Ontem", nome do dia da semana ou "dd/MM/yyyy") **já existe** em `src/components/whatsapp/DateSeparator.tsx` e também a função auxiliar `shouldShowDateSeparator`. Basta importá-los e integrá-los no loop de renderização do `LeadHistory`.

---

## Lógica de inserção dos separadores

Dentro do `.map()` de `filteredEvents`, antes de renderizar cada card de evento, verificar se a data do evento atual é diferente da data do evento anterior. Se sim, renderizar o `<DateSeparator>` imediatamente antes do card:

```
[ Hoje ]
  ↳ Lead criado via Webhook
  ↳ Atribuído para Raquel
[ Ontem ]
  ↳ Mensagem WhatsApp enviada
  ↳ Mudança de etapa: Qualificados → Proposta
[ Segunda-feira ]
  ↳ Ligação realizada
[ 10/01/2026 ]
  ↳ Lead criado
```

---

## Regras de exibição (já implementadas no componente existente)

| Situação | Label exibida |
|---|---|
| Data de hoje | "Hoje" |
| Data de ontem | "Ontem" |
| Menos de 7 dias atrás | Nome do dia (ex: "Segunda-feira") |
| 7 dias ou mais | "dd/MM/yyyy" (ex: "10/01/2026") |

---

## Ajuste no cálculo de `isLastEvent`

O separador de data é um nó extra entre os cards, mas **não deve afetar** o cálculo de `isLastEvent` (que controla a linha de conexão vertical). A lógica permanece baseada no índice de `filteredEvents`.

---

## Arquivo afetado

### `src/components/leads/LeadHistory.tsx`

**1. Adicionar import no topo:**
```ts
import { DateSeparator, shouldShowDateSeparator } from '@/components/whatsapp/DateSeparator';
```

**2. No loop `.map()`, adicionar separador antes de cada card:**
```tsx
return filteredEvents.map((event, index) => {
  const prevEvent = index > 0 ? filteredEvents[index - 1] : null;
  const showSeparator = shouldShowDateSeparator(
    event.timestamp,
    prevEvent?.timestamp ?? null
  );

  return (
    <React.Fragment key={event.id}>
      {showSeparator && (
        <DateSeparator date={new Date(event.timestamp)} />
      )}
      <div className="relative flex gap-3 pl-9">
        {/* ... conteúdo existente do card ... */}
      </div>
    </React.Fragment>
  );
});
```

> O `React.Fragment` com `key={event.id}` agrupa o separador + o card sem adicionar nós extras no DOM, mantendo a estrutura existente intacta.

---

## Detalhe visual

O separador herda o estilo já definido:
- Bolinha cinza suave com borda arredondada (`rounded-full bg-muted/80`)
- Texto `text-xs text-muted-foreground font-medium`
- Linhas horizontais implícitas por flexbox

Exatamente o mesmo visual já usado no chat do WhatsApp, garantindo consistência.

---

## Resumo da mudança

| | Antes | Depois |
|---|---|---|
| Separação por data | Nenhuma | "Hoje", "Ontem", dia da semana, dd/MM/yyyy |
| Arquivo modificado | — | `src/components/leads/LeadHistory.tsx` |
| Novo componente criado | — | Nenhum (reutiliza existente) |
| Risco | Nenhum | Nenhum (apenas inserção visual) |
