
# Plano: Corrigir Gráfico "Evolução de Clientes" Telecom

## Problema Raiz Identificado

O gráfico de barras está sendo renderizado, mas as barras são **invisíveis** porque:

1. **30 barras muito finas**: Com 30 dias no eixo X, cada barra tem apenas ~20px de largura
2. **Valores muito baixos**: Com apenas 1-7 clientes por dia, as barras têm altura de poucos pixels
3. **Container sem altura fixa**: O container usa `min-h-[200px]` mas sem altura fixa, pode estar comprimido
4. **Escala Y inadequada**: O Recharts pode estar usando uma escala que torna valores pequenos invisíveis

### Dados Reais do Paulo (15 clientes):
- 6 Novos, 2 Instalados, 7 Aguardando
- Espalhados em apenas 3-4 dias dos últimos 30

---

## Solução: Mudar para AreaChart (igual ao Imobiliário)

O `AreaChart` com linhas funciona muito melhor para dados esparsos porque:
- Linhas conectam os pontos e são sempre visíveis
- Áreas preenchidas dão feedback visual mesmo com poucos dados
- Funciona bem com muitos pontos no eixo X

### Mudanças no Componente

**Arquivo:** `src/components/dashboard/TelecomEvolutionChart.tsx`

```typescript
// Trocar BarChart por AreaChart (igual ao DealsEvolutionChart)
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Adicionar gradientes para cada status
<defs>
  <linearGradient id="gradientNovos" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
  </linearGradient>
  <linearGradient id="gradientInstalados" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
  </linearGradient>
  // ... outros gradientes
</defs>

// Usar Area em vez de Bar
<Area
  type="monotone"
  dataKey="novos"
  stroke="#3B82F6"
  strokeWidth={2}
  fill="url(#gradientNovos)"
  dot={false}
/>
```

### Mudança de Altura

```typescript
// Altura fixa igual ao gráfico que funciona
<div className="flex-1 min-h-[220px] h-[220px] sm:h-auto">
```

---

## Alternativa: Otimizar BarChart

Se preferir manter barras, ajustar:

1. **Altura fixa do container**
2. **Largura mínima das barras** via `barSize={12}`
3. **Escala Y com domínio mínimo** via `domain={[0, 'auto']}`
4. **Reduzir intervalos** (semanal em vez de diário para 30 dias)

---

## Recomendação

**Usar AreaChart** - é a mesma abordagem do gráfico imobiliário que funciona perfeitamente. O código será mais consistente e o resultado visual garantido.

---

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/TelecomEvolutionChart.tsx` | Substituir BarChart por AreaChart, adicionar gradientes, altura fixa |

