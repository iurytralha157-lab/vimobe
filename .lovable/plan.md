# Ajustes na Agenda

Vou refinar a experiência da agenda em quatro frentes: grade do calendário, cards de atividade, formulário e novo campo de imóvel para visitas. Boa notícia: **não precisa rodar nenhum SQL adicional** — a coluna `property_id` já existe na tabela `schedule_events`.

## 1. Grade do calendário sem linha de meia hora

Hoje cada bloco de 1h é dividido visualmente por uma linha no meio (criando dois "quadradinhos"). Vou remover essa linha mantendo dois slots clicáveis invisíveis (00 e 30), para a pessoa ainda conseguir criar atividade em meia hora.

- `CalendarView.tsx` — visões Dia e Semana: remover `border-b border-border/10` do primeiro `DroppableSlot` (linha divisora interna).

## 2. Cards de atividade mais legíveis

Os cards ficam bugados quando:
- A duração é curta (30 min ou menos) — horário e título se sobrepõem.
- Há várias atividades no mesmo horário (cards finos, lado a lado).

Mudanças no `ActivityCard`:
- Layout mais robusto para alturas pequenas: quando altura ≤ 28px (15-30 min), mostrar apenas título numa linha só, com fonte ainda menor e horário escondido (ou em tooltip).
- Quando altura entre 28-56px (até 1h), título numa linha + horário em outra, com `truncate` e tamanho responsivo.
- Quando há colunas múltiplas (totalColumns > 1), reduzir ainda mais padding e fonte, ocultar ícone Clock, e mostrar só o nome em alturas curtas.
- Garantir que o título não cubra o horário (estrutura com `min-h-0` e `flex-1 truncate`).
- Cor de borda mais sutil (`border` em vez de `border-2`) para cards finos.

## 3. Formulário (EventSheet) — pequenas correções

- Renomear label **"Assunto"** → **"Título da atividade"**.
- Corrigir bug visual do campo: input com `bg-background` explícito e padding correto (hoje o foco laranja sobrepõe o conteúdo).
- **Busca de leads**: o `Command` do shadcn aplica filtro client-side por cima dos resultados do servidor, e como cada item tem ícone + spans aninhados, o cmdk falha em encontrar o texto. Vou adicionar `shouldFilter={false}` no `<Command>` para confiar 100% no resultado do servidor (`useLeads({ search })`).
- Aumentar `limit` da busca de leads de 5 → 20 para mostrar mais resultados.
- Mostrar telefone/email mesmo quando ambos existirem.

## 4. Campo "Imóvel" (apenas quando tipo = Visita)

Adicionar selector de imóvel no `EventSheet`, que só aparece quando `selectedType === 'visit'`. Funciona igual ao selector de lead:

- Hook `useProperties` (já existe em `src/hooks/use-properties.ts`) com busca por código/título.
- Estado `selectedPropertyId` + `selectedPropertyTitle`.
- Card exibindo o imóvel selecionado com botão de remover.
- Ao salvar, incluir `property_id` no payload do `createEvent`/`updateEvent`.
- No modo visualização, mostrar o imóvel vinculado com link para a página dele.

Verificar `use-schedule-events.ts` para garantir que o `select` traz `property:properties(id, title, codigo)` e que o `insert/update` aceita `property_id`.

## Detalhes técnicos

```text
Arquivos editados:
├── src/components/schedule/CalendarView.tsx   (grid + ActivityCard)
├── src/components/schedule/EventSheet.tsx     (label, busca lead, campo imóvel)
└── src/hooks/use-schedule-events.ts           (incluir property no select se faltar)
```

Sem migrations. Sem novos hooks (reaproveita `useProperties`).

## Fora de escopo (confirmar se quer agora)

- Visualização "Mês" e "Ano" não foram tocadas — só Dia/Semana têm a linha divisora.
- Não vou mexer no `EventForm.tsx` antigo (Dialog) porque a Agenda já usa o `EventSheet`.