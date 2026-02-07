
## Plano: Correção do Bug de Comissões + Implementação do DRE

### Parte 1: Correção do Bug de Comissões

**Problema identificado:** Quando um corretor é selecionado no formulário de contrato, ele não está sendo persistido corretamente na tabela `contract_brokers`. Por isso, quando o contrato é ativado, nenhuma comissão é gerada.

**Solução proposta:**

1. **Investigar e corrigir o BrokerSelector**
   - Verificar se o componente está salvando corretamente no submit
   - Adicionar logs para debug
   - Garantir que mobile e desktop salvem igual

2. **Adicionar validação na ativação**
   - Mostrar aviso se contrato não tem corretor vinculado
   - Perguntar se deseja continuar sem gerar comissões

3. **Criar botão "Regenerar Comissões"**
   - Para contratos já ativados que não geraram comissões
   - Permite corrigir sem precisar excluir e recriar

---

### Parte 2: Implementação do DRE

O DRE (Demonstrativo de Resultado do Exercício) mostrará a saúde financeira da organização seguindo a estrutura contábil.

#### Estrutura do DRE

```text
=== DRE - Período XX/XX a XX/XX ===

(+) RECEITA OPERACIONAL BRUTA
    - Vendas de Imóveis
    - Comissões sobre Vendas
    - Locações
    - Serviços

(-) DEDUÇÕES DA RECEITA
    - Impostos sobre Vendas
    - Devoluções e Cancelamentos

(=) RECEITA LÍQUIDA

(-) CUSTOS OPERACIONAIS
    - Custo de Vendas
    - Comissões Pagas

(=) LUCRO BRUTO

(-) DESPESAS OPERACIONAIS
    - Despesas Administrativas
    - Folha de Pagamento
    - Marketing e Publicidade
    - Aluguel e Condomínio
    - Utilities (água, luz, internet)
    
(=) RESULTADO OPERACIONAL (EBITDA)

(-) DESPESAS FINANCEIRAS
    - Juros e Multas
    - Taxas Bancárias

(+) RECEITAS FINANCEIRAS
    - Rendimentos
    - Juros Recebidos

(=) RESULTADO ANTES IR/CS

(-) Impostos sobre Lucro

(=) LUCRO/PREJUÍZO LÍQUIDO
```

---

### Arquitetura da Implementação

#### Banco de Dados

**Nova tabela: `dre_account_groups`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | ID único |
| organization_id | uuid | Organização |
| name | text | Nome do grupo (ex: "Receita Operacional") |
| type | enum | 'revenue', 'deduction', 'cost', 'expense', 'financial' |
| order | int | Ordem de exibição |
| parent_id | uuid | Grupo pai (para hierarquia) |
| is_system | bool | Se é padrão do sistema |

**Nova tabela: `dre_account_mappings`**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | ID único |
| organization_id | uuid | Organização |
| group_id | uuid | Grupo do DRE |
| category | text | Categoria do financial_entries |
| type | enum | 'receivable' ou 'payable' |

Isso permite mapear as categorias existentes para os grupos do DRE.

---

#### Frontend

**Nova página: `/financial/dre`**

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/FinancialDRE.tsx` | Página principal do DRE |
| `src/components/financial/DREReport.tsx` | Componente do relatório |
| `src/components/financial/DREAccountConfig.tsx` | Configuração de contas |
| `src/hooks/use-dre.ts` | Hook para buscar dados |

**Funcionalidades:**

1. **Visualização do DRE**
   - Filtro por período (mês, trimestre, ano, personalizado)
   - Toggle entre regime de caixa vs competência
   - Comparativo com período anterior
   - Análise vertical (% sobre receita)
   - Análise horizontal (variação entre períodos)

2. **Configuração de Contas**
   - Mapear categorias existentes para grupos do DRE
   - Criar novos grupos se necessário
   - Definir ordem de exibição

3. **Exportação**
   - PDF formatado
   - Excel com detalhamento
   - Comparativo multi-período

---

### Fluxo de Dados

```text
financial_entries
    ↓
(agrupado por category + type)
    ↓
dre_account_mappings
    ↓
(mapeado para grupos)
    ↓
dre_account_groups
    ↓
(estrutura hierárquica)
    ↓
DRE Formatado
```

---

### Arquivos a Modificar/Criar

| Ação | Arquivo |
|------|---------|
| **CRIAR** | `src/pages/FinancialDRE.tsx` |
| **CRIAR** | `src/components/financial/DREReport.tsx` |
| **CRIAR** | `src/components/financial/DREAccountConfig.tsx` |
| **CRIAR** | `src/components/financial/DRELineItem.tsx` |
| **CRIAR** | `src/hooks/use-dre.ts` |
| **EDITAR** | `src/App.tsx` (nova rota) |
| **EDITAR** | `src/components/layout/AppSidebar.tsx` (novo item menu) |
| **EDITAR** | `src/components/financial/BrokerSelector.tsx` (fix bug) |
| **EDITAR** | `src/hooks/use-contracts.ts` (validação + regenerar) |
| **MIGRAÇÃO** | Criar tabelas `dre_account_groups` e `dre_account_mappings` |
| **MIGRAÇÃO** | Seed dos grupos padrão do DRE |

---

### Seção Técnica

#### Hook use-dre.ts

```typescript
interface DRELine {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  percentage?: number; // % sobre receita
  variation?: number; // % variação período anterior
  children?: DRELine[];
  isTotal?: boolean;
}

interface DREData {
  period: { start: string; end: string };
  lines: DRELine[];
  totals: {
    grossRevenue: number;
    netRevenue: number;
    grossProfit: number;
    operatingResult: number;
    netResult: number;
  };
}
```

#### SQL para calcular DRE

```sql
WITH entry_totals AS (
  SELECT 
    m.group_id,
    SUM(CASE WHEN e.status = 'paid' THEN e.amount ELSE 0 END) as realized,
    SUM(e.amount) as total
  FROM financial_entries e
  JOIN dre_account_mappings m ON e.category = m.category AND e.type = m.type
  WHERE e.paid_date BETWEEN $1 AND $2
  GROUP BY m.group_id
)
SELECT 
  g.id,
  g.name,
  g.type,
  g.order,
  COALESCE(t.realized, 0) as value
FROM dre_account_groups g
LEFT JOIN entry_totals t ON g.id = t.group_id
ORDER BY g.order;
```

---

### Priorização Sugerida

**Fase 1 (Correção urgente):**
1. Fix do BrokerSelector
2. Botão regenerar comissões

**Fase 2 (DRE básico):**
1. Tabelas do banco
2. Hook e página básica
3. Visualização simples

**Fase 3 (DRE avançado):**
1. Configuração de contas
2. Comparativos e análises
3. Exportação PDF/Excel
