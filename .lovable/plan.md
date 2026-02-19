
# Reformulação Completa da Página de Performance do Corretor

## Diagnóstico do estado atual

A página `src/pages/BrokerPerformance.tsx` exibe um ranking genérico da equipe com valores em R$ visíveis para todos — o que viola o requisito de privacidade dos dados financeiros por corretor.

O hook `use-broker-performance.ts` busca dados de todos os corretores em uma única query client-side, sem separação entre "minha performance" e "ranking da equipe".

Não existe tabela de metas de corretor no banco — precisa ser criada.

---

## O que será criado/modificado

### 1. Migration SQL — tabela `broker_monthly_goals`

Nova tabela para armazenar metas mensais por corretor:

```sql
CREATE TABLE public.broker_monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,          -- 1-12
  goal_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE public.broker_monthly_goals ENABLE ROW LEVEL SECURITY;

-- Corretor só vê/edita sua própria meta
CREATE POLICY "Users can manage own goals"
ON public.broker_monthly_goals
FOR ALL
USING (user_id = auth.uid());

-- Admin vê todas da org
CREATE POLICY "Admins can view all goals"
ON public.broker_monthly_goals
FOR SELECT
USING (
  organization_id = get_user_organization_id()
  AND (is_admin() OR is_super_admin())
);
```

### 2. Novo hook `use-my-performance.ts`

Dados privados do corretor logado (auth.uid()):

- `myLeadsWon` — leads com `deal_status = 'won'` e `won_at` no mês atual e `assigned_user_id = auth.uid()`
- `myTotalSales` — soma de `valor_interesse` desses leads
- `myTicketMedio` — totalSales / count
- `myActiveContracts` — `contracts` com `created_by = auth.uid()` e `status = 'active'`
- `myGoal` — busca/salva meta na tabela `broker_monthly_goals`
- `myLast6Months` — array com volume de vendas dos últimos 6 meses (para gráfico de linha)
- `myStreak` — calcula meses consecutivos em que bateu a meta

A lógica de streak usará as queries dos últimos 12 meses comparando `totalSales >= goal_amount` mês a mês.

### 3. Novo hook `use-team-ranking.ts`

Dados do ranking público (todos os corretores da org):

- Busca `users` da organização
- Para cada usuário: conta apenas `closedLeads` (deal_status = 'won') no mês
- **Nunca expõe valor em R$ de outros corretores**
- Adiciona `myPosition` (posição do usuário logado no ranking)
- Ordena por `closedLeads DESC`

### 4. Refatoração de `src/pages/BrokerPerformance.tsx`

Layout em duas seções bem distintas:

#### Área 1 — Minha Performance (topo da página)
```
┌─────────────────────────────────────────────────────────┐
│  👤 Minha Performance — Fevereiro 2026                  │
├──────────┬──────────┬──────────┬────────────────────────┤
│ R$ Total │ Vendas   │ Ticket   │ Contratos Ativos       │
│ vendido  │ no mês   │ Médio    │                        │
├──────────┴──────────┴──────────┴────────────────────────┤
│ Meta Mensal: R$ [input editável]     [████░░░░] 62%     │
├─────────────────────────────────────────────────────────┤
│ 📈 Evolução dos últimos 6 meses (gráfico de linha)      │
└─────────────────────────────────────────────────────────┘
```

- Barra de meta: clicável para editar o valor da meta (input inline ou modal simples)
- Gráfico de linha usando Recharts `LineChart` com `AreaChart` (mesma lib já usada no projeto)
- Streak badge: "🔥 3 meses seguidos batendo a meta"

#### Área 2 — Ranking da Equipe (abaixo)
```
┌─────────────────────────────────────────────────────────┐
│  🏆 Ranking da Equipe — Fevereiro 2026                  │
├─────────────────────────────────────────────────────────┤
│  🥇  [Avatar] João Silva        ██████████  12 vendas   │
│  🥈  [Avatar] Maria Souza       ████████░░  10 vendas   │
│  🥉  [Avatar] Carlos Lima       ███████░░░   8 vendas   │
│  4º  [Avatar] [Você] Ana Costa  █████░░░░░   6 vendas  ◄ destacado│
│  5º  [Avatar] Pedro Alves       ████░░░░░░   5 vendas   │
└─────────────────────────────────────────────────────────┘
```

- Barras de progresso relativas ao líder (líder = 100%)
- Nome do usuário logado destacado com badge "Você" e fundo diferenciado
- Emojis de medalha para top 3
- Sem exibição de R$ para outros corretores (apenas contagem de negócios)

---

## Segurança / RLS

| Dado | Quem vê |
|---|---|
| `valor_interesse` dos leads (meu) | Só o próprio corretor via `assigned_user_id = auth.uid()` |
| `closedLeads` count (ranking) | Todos da organização (número, não valor) |
| `broker_monthly_goals` | Cada usuário vê só a própria meta (RLS `user_id = auth.uid()`) |
| `contracts` count ativo | O próprio corretor via `created_by = auth.uid()` |

As queries de "Minha Performance" usam filtro explícito por `auth.uid()` e dependem do RLS já existente (`Users can view own commissions`, `Hierarchical lead access`).

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabela `broker_monthly_goals` com RLS |
| `src/hooks/use-my-performance.ts` | Criar — dados privados do corretor logado |
| `src/hooks/use-team-ranking.ts` | Criar — ranking público sem valores em R$ |
| `src/pages/BrokerPerformance.tsx` | Reformular completamente o layout e lógica |
| `src/hooks/use-broker-performance.ts` | Manter (usado por admins em outras telas potencialmente), apenas deixar de usar na página |

---

## Detalhes de implementação

### Cálculo de streak

```ts
// Para cada mês dos últimos 12, verificar se totalSales >= goal_amount
// Contar a sequência contínua terminando no mês atual
let streak = 0;
for (let i = 0; i < 12; i++) {
  const monthData = last12Months[i]; // mais recente primeiro
  if (monthData.totalSales >= monthData.goal) {
    streak++;
  } else {
    break; // sequência quebrada
  }
}
```

### Meta editável inline

- Input `number` com `onBlur` que faz upsert em `broker_monthly_goals`
- Estado local com debounce de 500ms para não fazer múltiplas escritas
- Feedback visual de salvamento ("Meta salva ✓")

### Gráfico de linha (últimos 6 meses)

- Usar `AreaChart` do Recharts (já presente no projeto)
- Eixo X: "Ago", "Set", "Out", "Nov", "Dez", "Fev"
- Eixo Y: valores em R$ formatados
- Uma única série `totalSales` com cor accent do sistema

