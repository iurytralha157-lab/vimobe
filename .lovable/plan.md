
## Verificação e Correção do Layout da Página de Performance

### Diagnóstico

Analisando o código atual de `src/pages/BrokerPerformance.tsx`:

- Linha 156: `<div className="space-y-8 w-full pb-10">` — as duas áreas ficam **empilhadas em coluna única** tanto no desktop quanto no mobile
- As duas `<section>` (Minha Performance e Ranking da Equipe) são filhos diretos desse div e não têm nenhuma estrutura de grid

O `AppLayout` já aplica `px-4 md:px-6 py-3 md:py-4` no `<main>`, então o padding lateral já está correto — apenas o grid interno precisa ser ajustado.

### Layout proposto

```text
DESKTOP (lg+):
┌──────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────┐  ┌──────────────────────────┐│
│  │  ÁREA 1 — Minha Performance│  │  ÁREA 2 — Ranking         ││
│  │  (flex-1, coluna esquerda) │  │  (w-[380px] ou 40%,      ││
│  │  KPI Cards (4 colunas)     │  │  sticky, max-h com scroll)││
│  │  Barra de meta             │  │  🥇 🥈 🥉 lista...       ││
│  │  Gráfico 6 meses           │  │                          ││
│  └────────────────────────────┘  └──────────────────────────┘│
└──────────────────────────────────────────────────────────────┘

MOBILE (< lg):
┌──────────────────────┐
│  ÁREA 1              │
│  (coluna única)      │
│  KPI Cards (2 cols)  │
│  Barra de meta       │
│  Gráfico             │
├──────────────────────┤
│  ÁREA 2              │
│  Ranking lista       │
└──────────────────────┘
```

### Mudança técnica

**Arquivo:** `src/pages/BrokerPerformance.tsx`

**Substituir** o container de linha 156:

```tsx
// ANTES
<div className="space-y-8 w-full pb-10">
  <section>...Área 1...</section>
  <section>...Área 2...</section>
</div>

// DEPOIS
<div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 w-full pb-10 items-start">
  <section>...Área 1...</section>
  <section className="lg:sticky lg:top-0">...Área 2...</section>
</div>
```

Detalhes:
- `grid-cols-1` → coluna única no mobile (empilhado)
- `lg:grid-cols-[1fr_380px]` → no desktop: coluna esquerda ocupa espaço restante, coluna direita tem 380px fixos
- `items-start` → as duas colunas alinham pelo topo, sem esticar a altura
- `lg:sticky lg:top-0` na seção do ranking → o ranking "gruda" ao topo ao rolar, enquanto a coluna da esquerda continua rolando
- `gap-6` → espaçamento de 24px entre as duas colunas
- Remover `space-y-8` (não faz sentido em grid horizontal)

Também ajustar os KPI cards da Área 1 para 4 colunas mesmo em telas menores quando há espaço (no desktop a coluna já é mais estreita por dividir com o ranking):
- Manter `grid-cols-2 lg:grid-cols-4` nos KPI cards — já funciona corretamente

### Comportamento em cada breakpoint

| Breakpoint | Layout |
|---|---|
| Mobile (`< 768px`) | Coluna única: Área 1 acima, Área 2 abaixo |
| Tablet (`768px–1023px`) | Coluna única: Área 1 acima, Área 2 abaixo |
| Desktop (`≥ 1024px`) | Duas colunas lado a lado: Performance (esquerda) + Ranking (direita, sticky) |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/BrokerPerformance.tsx` | Trocar `div.space-y-8` por `div.grid` e adicionar `sticky` na seção de ranking |
