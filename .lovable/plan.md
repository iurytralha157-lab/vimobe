
# Plano: Corrigir Dashboard Telecom - Evolução de Clientes e Funil de Vendas

## Problemas Identificados

### 1. Gráfico "Evolução de Clientes" Mostrando "Nenhum dado disponível"
O hook `useTelecomEvolutionData` agrupa clientes pelo **status atual** em vez de contabilizar corretamente a evolução. A lógica atual:
- Busca clientes criados no período
- Conta quantos têm cada status ATUALMENTE

Isso não faz sentido para um gráfico de "evolução" - um cliente que foi criado em janeiro como "NOVO" e hoje está "INSTALADO" aparece como "INSTALADO" na data de criação, distorcendo a visualização.

### 2. Funil de Vendas Mostrando 0 Leads em Todos os Estágios
Mesmo com leads existentes nas pipelines (confirmado: REPROVADO tem 6, DOCUMENTOS tem 2, etc.), o funil mostra 0. As causas prováveis são:
- Filtro de data padrão (`last30days`) filtrando por `created_at` pode excluir leads mais antigos que foram movidos recentemente
- A RPC `get_funnel_data` filtra leads por `created_at`, mas deveria contar leads **atuais** em cada estágio

### 3. Origens de Leads Vazio
Mesmo problema do funil - a RPC `get_lead_sources_data` também filtra por data de criação.

---

## Solução Proposta

### Correção 1: Hook `useTelecomEvolutionData`

**Arquivo:** `src/hooks/use-telecom-dashboard-stats.ts`

Alterar a lógica para mostrar uma evolução que faça sentido:
- **Opção A (Recomendada):** Mostrar quantos clientes **entraram** (foram criados) em cada período, todos contando como "novos" no momento da criação
- **Opção B:** Mostrar snapshot acumulativo do total de clientes por período

Implementação da Opção A - mostrar novos clientes por período:

```typescript
// Em vez de agrupar por status atual, contar todos como "novos" na data de criação
// E separadamente, contar instalações por installation_date

customers.forEach((customer) => {
  const createdDate = parseISO(customer.created_at);
  const key = getIntervalKey(createdDate);
  const point = grouped.get(key);
  
  if (point) {
    // Todo cliente conta como "novo" na data de criação
    point.novos++;
    
    // Se tem installation_date, contar também como instalado nessa data
    if (customer.installation_date) {
      const installDate = parseISO(customer.installation_date);
      const installKey = getIntervalKey(installDate);
      const installPoint = grouped.get(installKey);
      if (installPoint) {
        installPoint.instalados++;
      }
    }
  }
});
```

### Correção 2: Funil de Vendas - Remover Filtro de Data na Contagem

**Problema:** O funil deveria mostrar a contagem **atual** de leads em cada estágio, não filtrado por data de criação.

**Arquivos a Modificar:**
- `src/hooks/use-dashboard-stats.ts` - função `useFunnelData`

Alterar para NÃO passar filtro de data para a RPC quando se trata do funil (o funil é um snapshot do estado atual):

```typescript
// No hook useFunnelData, o funil deveria mostrar estado atual
// Não faz sentido filtrar por data de criação do lead

const { data, error } = await (supabase as any).rpc('get_funnel_data', {
  p_date_from: null,  // Não filtrar por data para o funil
  p_date_to: null,
  p_team_id: filters?.teamId || null,
  p_user_id: effectiveUserId || null,
  p_source: filters?.source || null,
  p_pipeline_id: pipelineId || null,
});
```

### Correção 3: Origens de Leads - Manter Filtro de Data

Para origens de leads, o filtro de data faz sentido (quantos leads vieram de cada fonte no período). Manter como está, mas verificar se os leads estão sendo criados dentro do período filtrado.

---

## Detalhes Técnicos das Mudanças

### Arquivo 1: `src/hooks/use-telecom-dashboard-stats.ts`

Modificar a função `useTelecomEvolutionData` para:
1. Buscar também o campo `installation_date` 
2. Contar todos os clientes como "novos" na data de criação
3. Contar clientes como "instalados" na data de instalação (não na data de criação)
4. Manter os outros status como contagem acumulativa opcional

### Arquivo 2: `src/hooks/use-dashboard-stats.ts`

Na função `useFunnelData`:
1. Não passar filtros de data para a RPC `get_funnel_data`
2. O funil representa o estado atual da pipeline, não leads criados em um período

---

## Resultado Esperado

1. **Evolução de Clientes:**
   - Gráfico mostrará quantos clientes novos entraram por período
   - Instalações serão contadas pela data real de instalação
   - Visualização mais precisa e útil

2. **Funil de Vendas:**
   - Mostrará a contagem real de leads em cada estágio
   - REPROVADO: 6, DOCUMENTOS: 2, etc.
   - Filtros de equipe/usuário continuam funcionando

3. **Origens de Leads:**
   - Continuará filtrando por data de criação (faz sentido para análise)
   - Mostrará distribuição correta por fonte

---

## Alternativa: Adicionar Toggle para Filtro de Data no Funil

Se desejado, podemos adicionar um switch no dashboard para escolher entre:
- "Leads atuais" (sem filtro de data) - padrão
- "Leads criados no período" (com filtro de data)
