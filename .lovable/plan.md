
## Plano de Correção: Filtro de Responsável para Usuários com Permissão lead_view_all

### Problema Identificado
O filtro de "Responsável" na página de Pipeline (Kanban) está renderizando uma versão estática (não interativa) para a Izadora, mostrando apenas o nome dela sem possibilidade de filtrar por outros usuários.

**Causa raiz:** O código verifica apenas `isAdmin` para decidir se mostra o dropdown interativo. A permissão `lead_view_all` (que a Izadora possui) não está sendo considerada nessa decisão.

**Código atual (linha 610):**
```jsx
{isAdmin ? (
  <Select>...</Select>  // Dropdown interativo
) : (
  <div>Nome fixo</div>  // Versão estática - SEM FILTRO
)}
```

### Solução Proposta
Alterar a condição para incluir a permissão `hasLeadViewAll`:

```jsx
{(isAdmin || hasLeadViewAll) ? (
  <Select>...</Select>  // Dropdown interativo
) : (
  <div>Nome fixo</div>  // Versão estática
)}
```

### Alterações Técnicas

**Arquivo:** `src/pages/Pipelines.tsx`

1. **Linha 610** - Alterar a condição do filtro de responsável:
   - **De:** `{isAdmin ? (`
   - **Para:** `{(isAdmin || hasLeadViewAll) ? (`

Essa alteração permitirá que:
- Admins vejam o dropdown (como já funciona)
- Usuários com permissão `lead_view_all` também vejam o dropdown interativo
- Usuários sem permissão continuem vendo apenas seu próprio nome

### Impacto
- Izadora poderá clicar no filtro e escolher "Todos", "Cristiano Fernando", "Vendas Thays", etc.
- Nenhuma outra funcionalidade é afetada
- A correção é mínima (1 linha de código)
