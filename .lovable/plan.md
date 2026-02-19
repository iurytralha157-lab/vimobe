
## Problema

Na linha 156 de `src/pages/BrokerPerformance.tsx`, o container principal tem `max-w-5xl mx-auto`, que limita a largura da página a ~1024px — fazendo o conteúdo parecer estreito especialmente em telas maiores.

O usuário quer que a página **use toda a largura disponível** (sem limitação de `max-w`), mantendo padding lateral adequado para não encostar nas bordas.

## Mudança

**Arquivo:** `src/pages/BrokerPerformance.tsx` — linha 156

**Antes:**
```tsx
<div className="space-y-8 max-w-5xl mx-auto pb-10">
```

**Depois:**
```tsx
<div className="space-y-8 w-full pb-10">
```

Remover `max-w-5xl mx-auto` e usar apenas `w-full`, já que o `AppLayout` já cuida do padding lateral (`px-4 md:px-6`) no elemento `<main>`.

## Resultado esperado

A página ocupará toda a largura disponível dentro do `main`, idêntico ao comportamento das outras páginas do sistema (Dashboard, Pipelines, etc.).
