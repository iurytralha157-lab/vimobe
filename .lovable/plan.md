
## Adicionar 2 novos KPI cards em "Minha Performance"

### O que será adicionado

Dois novos cards na linha de KPIs da seção "Minha Performance", passando de 4 para 6 cards (grid `grid-cols-2 lg:grid-cols-3` na primeira linha, ou mantendo `lg:grid-cols-4` com scroll no mobile e empilhando em 2 colunas):

1. **Leads em Andamento** — quantidade de leads com `deal_status = 'open'` atribuídos ao corretor logado, com link clicável para `/pipelines`
2. **Tempo de Resposta Médio** — média em segundos/minutos/horas calculada a partir de `first_response_at - assigned_at` para leads do período selecionado

O banco já tem ambas as colunas necessárias: `first_response_at` (timestamp) e `assigned_at` (timestamp), confirmado na consulta ao banco.

---

### Arquivos modificados

#### 1. `src/hooks/use-my-performance.ts`

**Adicionar ao `MyPerformanceData` interface:**
```ts
export interface MyPerformanceData {
  totalSales: number;
  closedCount: number;
  ticketMedio: number;
  activeContracts: number;
  activeLeads: number;         // NOVO
  avgResponseSeconds: number | null; // NOVO
  currentGoal: number;
  goalProgress: number;
  streak: number;
  last6Months: MonthlyPerformance[];
}
```

**No `queryFn`, adicionar uma 4ª query paralela no `Promise.all`:**
```ts
const [leadsResult, contractsResult, goalsResult, activeLeadsResult] = await Promise.all([
  // ... queries existentes ...,
  
  // NOVA — leads em andamento do corretor (sem filtro de data, é um estado atual)
  supabase
    .from("leads")
    .select("id, assigned_at, first_response_at")
    .eq("organization_id", organizationId)
    .eq("assigned_user_id", userId)
    .eq("deal_status", "open"),
]);
```

**Calcular as duas novas métricas:**
```ts
const activeLeads = activeLeadsResult.data?.length || 0;

// Tempo de resposta: média dos leads ganhos no período que têm first_response_at
const responseLeads = wonLeads.filter(l => l.first_response_at && l.assigned_at);
const avgResponseSeconds = responseLeads.length > 0
  ? responseLeads.reduce((sum, l) => {
      const diff = new Date(l.first_response_at).getTime() - new Date(l.assigned_at).getTime();
      return sum + diff / 1000;
    }, 0) / responseLeads.length
  : null;
```

> **Nota importante**: para calcular o tempo de resposta, a query de `leadsResult` precisa incluir `assigned_at` e `first_response_at` no select. Será ajustado de `"id, valor_interesse, won_at"` para `"id, valor_interesse, won_at, assigned_at, first_response_at"`.

**Atualizar o return:**
```ts
return {
  // ... campos existentes ...,
  activeLeads,
  avgResponseSeconds,
};
```

---

#### 2. `src/pages/BrokerPerformance.tsx`

**Adicionar imports:**
- `Clock` e `Users` do `lucide-react`
- `Link` do `react-router-dom`
- A função `formatSlaTime` de `use-sla-reports` (já existe e formata segundos → "2h 30m")

**Atualizar o grid de KPI cards** de `grid-cols-2 lg:grid-cols-4` para `grid-cols-2 lg:grid-cols-3` (6 cards ficam melhor em 3 colunas no desktop):

**Card "Leads em Andamento"** — clicável, leva para `/pipelines`:
```tsx
<Link to="/pipelines">
  <Card className="border shadow-sm hover:border-primary/40 transition-colors cursor-pointer">
    <CardHeader ...>
      <CardTitle ...>Leads em Andamento</CardTitle>
      <Users className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent ...>
      <div className="text-2xl font-bold text-foreground">
        {perf?.activeLeads ?? 0}
      </div>
      <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
        Ver no funil →
      </p>
    </CardContent>
  </Card>
</Link>
```

**Card "Tempo de Resposta Médio"**:
```tsx
<Card className="border shadow-sm">
  <CardHeader ...>
    <CardTitle ...>Tempo de Resposta</CardTitle>
    <Clock className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent ...>
    <div className="text-2xl font-bold text-foreground">
      {perf?.avgResponseSeconds != null
        ? formatSlaTime(Math.round(perf.avgResponseSeconds))
        : "—"}
    </div>
    <p className="text-xs text-muted-foreground mt-0.5">tempo médio 1ª resposta</p>
  </CardContent>
</Card>
```

---

### Layout do grid resultante

```text
Desktop (lg):  [ Total Vendido ] [ Negócios Fechados ] [ Ticket Médio ]
               [ Contratos Ativos ] [ Leads em Andamento ] [ Tempo de Resposta ]

Mobile:        [ Total Vendido ] [ Negócios Fechados ]
               [ Ticket Médio  ] [ Contratos Ativos  ]
               [ Leads em And. ] [ Tempo de Resposta ]
```

Grid CSS: `grid-cols-2 lg:grid-cols-3` — mantém consistência visual e aproveita melhor a tela.

---

### Resumo das mudanças

| Arquivo | Mudança |
|---|---|
| `src/hooks/use-my-performance.ts` | Adicionar `activeLeads` e `avgResponseSeconds` à interface e queryFn |
| `src/pages/BrokerPerformance.tsx` | Adicionar 2 cards, ajustar grid para 3 colunas no desktop, importar `Link`, `Clock`, `Users`, `formatSlaTime` |
