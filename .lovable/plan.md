
## Aumentar visibilidade das linhas horizontais do gráfico "Evolução de Negócios"

### Diagnóstico

No arquivo `src/components/dashboard/DealsEvolutionChart.tsx`, o `CartesianGrid` está configurado com `opacity={0.3}`, o que deixa as linhas horizontais quase invisíveis no tema escuro.

```tsx
<CartesianGrid 
  strokeDasharray="3 3" 
  stroke="hsl(var(--border))" 
  opacity={0.3}        // ← muito apagado
  vertical={false}
/>
```

### Mudança

Aumentar o `opacity` de `0.3` para `0.6` — o suficiente para as linhas ficarem visíveis sem poluir o gráfico:

```tsx
<CartesianGrid 
  strokeDasharray="3 3" 
  stroke="hsl(var(--border))" 
  opacity={0.6}        // ← mais visível
  vertical={false}
/>
```

### Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/DealsEvolutionChart.tsx` | `opacity` do `CartesianGrid` de `0.3` → `0.6` |
