
## Remover Completamente a Página de Performance

### Arquivos a DELETAR

| Arquivo | Motivo |
|---|---|
| `src/pages/BrokerPerformance.tsx` | A própria página |
| `src/hooks/use-broker-performance.ts` | Hook exclusivo da página |
| `src/hooks/use-my-performance.ts` | Hook exclusivo da página |

### Arquivos a EDITAR (remover referências)

**1. `src/App.tsx`**
- Remover o import: `import BrokerPerformancePage from "./pages/BrokerPerformance";`
- Remover a rota: `<Route path="/reports/performance" ... />`

**2. `src/components/layout/AppSidebar.tsx`**
- Remover o item de menu com `path: '/reports/performance'` e `labelKey: 'performance'`
- Remover o filtro de visibilidade que referencia `/reports/performance`

**3. `src/components/layout/MobileSidebar.tsx`**
- Remover o item de menu com `path: '/reports/performance'` e `labelKey: 'performance'`
- Remover o filtro de visibilidade que referencia `/reports/performance`

### O que NÃO será tocado

- Nenhum outro hook, componente ou página será alterado
- As traduções com a chave `performance` nos arquivos `src/i18n/translations/` serão mantidas (são strings simples que não causam erro)

### Resultado

A rota `/reports/performance` deixará de existir, o menu lateral não terá mais o item "Performance", e os 3 arquivos exclusivos da feature serão removidos do projeto.
