
## Corrigir o redirecionamento do card "Leads em Andamento"

### Problema identificado

O card "Leads em Andamento" usa `<Link to="/pipelines">`, mas a rota correta registrada no `App.tsx` é `/crm/pipelines`. Por isso ao clicar aparece o erro de página não encontrada (404/NotFound).

### Correção

**Arquivo: `src/pages/BrokerPerformance.tsx`** — linha 290

Alterar:
```tsx
<Link to="/pipelines" className="block">
```

Para:
```tsx
<Link to="/crm/pipelines" className="block">
```

É uma mudança de uma linha só.
