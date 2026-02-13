# Auditoria dos Filtros do Dashboard - Correções Necessárias

## Diagnóstico

Analisei cada componente do Dashboard contra os 4 filtros (Data, Usuário, Equipe, Origem). Encontrei **3 problemas**:

---

## Problemas Encontrados

### 1. Funil de Vendas -- NAO filtra por DATA (bug principal)

No hook `useFunnelData`, as datas sao explicitamente ignoradas:

```text
p_date_from: null,  // "Nao filtrar por data - funil eh estado atual"
p_date_to: null,
```

O funil sempre mostra TODOS os leads do pipeline, independente do filtro de data selecionado. Isso explica o comportamento que voce notou.

**Correcao:** Passar as datas do filtro para a RPC `get_funnel_data`.

---

### 2. Top Brokers -- queryKey INCOMPLETA (bug de cache)

O `useTopBrokers` nao inclui todos os filtros na queryKey:

```text
// ATUAL (faltam userId, source, dateTo)
queryKey: ['top-brokers', filters?.dateRange?.from?.toISOString(), filters?.teamId]

// CORRETO
queryKey: ['top-brokers', from, to, teamId, userId, source]
```

Alem disso, o hook **nao aplica filtros de userId nem source** na query. Se voce seleciona um usuario ou uma origem, o ranking nao muda.

**Correcao:** Adicionar `userId`, `source` e `dateTo` na queryKey e aplicar esses filtros na query.

---

### 3. Top Brokers -- Nao filtra por usuario nem origem (bug de logica)

A funcao `useTopBrokers` aplica apenas `dateRange` e `teamId` (via visibility). Os filtros `userId` e `source` sao completamente ignorados.

**Correcao:** Adicionar `.eq('assigned_user_id', filters.userId)` e `.eq('source', filters.source)` quando presentes.

---

## Componentes que JA FUNCIONAM corretamente


| Componente                                     | Data | Usuario | Equipe | Origem |
| ---------------------------------------------- | ---- | ------- | ------ | ------ |
| KPI Cards (`useEnhancedDashboardStats`)        | OK   | OK      | OK     | OK     |
| Evolucao de Negocios (`useDealsEvolutionData`) | OK   | OK      | OK     | OK     |
| Origens de Leads (`useLeadSourcesData`)        | OK   | OK      | OK     | OK     |


---

## Plano de Implementacao

### Arquivo: `src/hooks/use-dashboard-stats.ts`

**Alteracao 1 - `useFunnelData` (linhas 395-401):**
Substituir `p_date_from: null` e `p_date_to: null` pelos valores reais do filtro:

```text
p_date_from: filters?.dateRange?.from?.toISOString() || null,
p_date_to: filters?.dateRange?.to?.toISOString() || null,
```

Remover o comentario enganoso sobre "snapshot atual".

**Alteracao 2 - `useTopBrokers` (linha 482):**
Corrigir a queryKey para incluir todos os filtros:

```text
queryKey: [
  'top-brokers',
  filters?.dateRange?.from?.toISOString(),
  filters?.dateRange?.to?.toISOString(),
  filters?.teamId,
  filters?.userId,
  filters?.source
]
```

**Alteracao 3 - `useTopBrokers` (apos linha 516):**
Adicionar filtros de usuario e origem na query principal e no fallback:

```text
// Filtro por usuario especifico
if (filters?.userId) {
  query = query.eq('assigned_user_id', filters.userId);
}
// Filtro por origem
if (filters?.source) {
  query = query.eq('source', filters.source);
}
```

---

## Resumo das Mudancas


| Componente      | O que muda                                |
| --------------- | ----------------------------------------- |
| Funil de Vendas | Passa datas reais para a RPC              |
| Top Brokers     | queryKey completa + filtros userId/source |


Apenas 1 arquivo alterado: `src/hooks/use-dashboard-stats.ts`. Sem mudancas no frontend, banco ou edge functions.