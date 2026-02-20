
## Restaurar a página de Performance completa

### O que aconteceu

A página `BrokerPerformance.tsx` foi sobrescrita por uma versão mais simples, perdendo a seção "Minha Performance" que havia sido construída com:
- KPIs privados do corretor logado (vendas, comissão, contratos ativos, leads em andamento, tempo de resposta)
- Barra de meta mensal com progresso e streak de meses consecutivos
- Gráfico de evolução dos últimos 6 meses
- Filtro de período dinâmico

Além disso, o card "Tempo Médio" está com bug — não exibe o valor.

---

### O que será reconstruído

#### Estrutura da página (duas seções)

```text
BrokerPerformance
├── 1. "Minha Performance" (área privada, só dados do usuário logado)
│   ├── KPI Cards: Total Vendido | Comissão | Contratos Ativos | Leads em Andamento | Tempo Médio
│   ├── Barra de meta: [████████░░] 80% — 🔥 3 meses consecutivos
│   └── Gráfico de área: Evolução dos últimos 6 meses (barras: vendas da equipe vs meta do corretor)
│
└── 2. "Ranking da Equipe" (público, sem valores R$ de terceiros)
    ├── KPI Cards: Total Leads | Conversão Média | Tempo Médio | Total Vendas | Comissões
    └── Tabela com posição, avatar, nome, conversão, tempo médio, vendas, comissões
```

---

### Arquivos modificados

#### `src/pages/BrokerPerformance.tsx`

Reescrever o componente completo com:

**1. Imports adicionais:**
```ts
import { useMyPerformance, useUpsertMyGoal } from "@/hooks/use-my-performance";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy } from "lucide-react";
```

**2. Seção "Minha Performance"** (novo bloco antes do ranking):
- 5 KPI cards responsivos: Total Vendido, Comissão Total, Contratos Ativos, Leads em Andamento (com link para `/crm/pipelines`), Tempo Médio de Resposta
- Card de Meta Mensal: input de meta editável + `Progress` bar + indicador de streak com ícone de chama
- Card de Evolução: `BarChart` do Recharts mostrando últimos 6 meses de vendas com linha de referência da meta

**3. Correção do card "Tempo Médio"** no bloco do ranking (exibir `formatTime(teamAverages.avgResponseTime)`)

**4. Layout responsivo:**
- Desktop: KPIs em grid 5 colunas, seções lado a lado
- Mobile: empilhado, gráfico de scroll horizontal

---

### Helpers e formatação

```ts
// Formatar segundos → "2h 15m" ou "45 min"
const formatSeconds = (s: number | null) => {
  if (s === null) return '-';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
};
```

---

### Nenhuma mudança de banco de dados necessária

O hook `useMyPerformance` e `useUpsertMyGoal` já existem em `src/hooks/use-my-performance.ts` e funcionam corretamente. Apenas o componente de página precisa ser atualizado.

---

### Resumo

| Arquivo | Mudança |
|---|---|
| `src/pages/BrokerPerformance.tsx` | Reescrever com seção "Minha Performance" + correção do card Tempo Médio |

