
# Plano: Corrigir Gráfico "Evolução de Clientes" - Telecom

## Problema Identificado

O gráfico "Evolução de Clientes" mostra a legenda com totais (Novos 1, Instalados 913, Aguardando 3, Cancelados 83), mas o gráfico em si está vazio/sem linhas.

### Causa Raiz

A lógica atual do hook `useTelecomEvolutionData`:

1. **Busca clientes criados no período** (últimos 30 dias) - ✅ Correto
2. **Conta "novos" pela data de criação** - ✅ Funciona
3. **Conta "instalados" APENAS pela `installation_date`** - ❌ Problema!

**Dados do banco:**
- 1.236 clientes total
- 856 clientes **sem** `installation_date` preenchido
- A maioria das `installation_date` são de 2025 (fora do período)
- Apenas 2 clientes têm `installation_date` nos últimos 30 dias

**Resultado:** A legenda calcula totais de todos os registros retornados, mas os pontos individuais do gráfico têm valores muito baixos, fazendo as linhas não aparecerem.

---

## Solução Proposta

Mudar a lógica para um gráfico de evolução mais útil:

### Nova Abordagem: Evolução por Status Atual

Em vez de tentar rastrear quando cada cliente mudou de status (complexo e requer histórico), mostrar a **distribuição atual dos clientes por período de criação**:

```
Para cada cliente criado no período:
  - Incrementar o contador do STATUS ATUAL na data de criação
```

Isso mostra "quantos clientes criados em cada período estão em cada status hoje".

### Mudanças no Hook `useTelecomEvolutionData`

**Arquivo:** `src/hooks/use-telecom-dashboard-stats.ts`

```typescript
customers.forEach((customer) => {
  const createdDate = parseISO(customer.created_at);
  const key = getIntervalKey(createdDate);
  const point = grouped.get(key);
  
  if (point) {
    // Mapear status para o campo correto
    const status = customer.status?.toLowerCase();
    
    switch (status) {
      case 'novo':
      case 'novos':
        point.novos++;
        break;
      case 'instalados':
      case 'instalado':
        point.instalados++;
        break;
      case 'aguardando':
        point.aguardando++;
        break;
      case 'em_analise':
      case 'em análise':
        point.em_analise++;
        break;
      case 'cancelado':
      case 'cancelados':
        point.cancelado++;
        break;
      case 'suspenso':
      case 'suspensos':
        point.suspenso++;
        break;
      case 'inadimplente':
      case 'inadimplentes':
        point.inadimplente++;
        break;
      default:
        // Status não mapeado, pode ser "novo" por padrão
        point.novos++;
    }
  }
});
```

---

## Resultado Esperado

O gráfico vai mostrar:
- **Linha Azul (Novos):** Clientes com status NOVO criados em cada período
- **Linha Verde (Instalados):** Clientes com status INSTALADOS criados em cada período
- **Linha Amarela (Aguardando):** Clientes com status AGUARDANDO criados em cada período
- etc.

A legenda continuará mostrando os totais corretos, e as linhas do gráfico vão corresponder a esses totais.

---

## Detalhes Técnicos

### Arquivo a Modificar
- `src/hooks/use-telecom-dashboard-stats.ts`

### Alteração na Query
Adicionar o campo `status` na query:
```typescript
.select('created_at, status, installation_date')
// Já está incluindo status ✅
```

### Alteração na Lógica de Agrupamento
Substituir a lógica atual (linhas 223-245) pela nova lógica que agrupa por status atual do cliente.

---

## Alternativa Considerada

**Snapshot Acumulativo:** Mostrar o total acumulado de clientes por status ao longo do tempo. Isso seria mais complexo e exigiria buscar histórico de mudanças de status (que não existe estruturado no banco).

A solução proposta é mais simples e mostra uma visão útil: "Quando os clientes foram criados e qual seu status atual".
