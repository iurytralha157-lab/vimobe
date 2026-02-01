
# Plano: Correção do Scroll para o Topo

## Problema Identificado
Ao clicar nos links do rodapé, a página muda mas continua mostrando o rodapé ao invés de ir para o topo. Isso acontece tanto no mobile quanto no desktop.

## Causa Raiz
1. **Timing do scroll**: O `window.scrollTo(0, 0)` simples pode ser ignorado pelo browser mobile
2. **Duplicação**: Há scroll to top em múltiplos lugares (ScrollToTop + PublicSiteLayout), causando possíveis conflitos
3. **Query params**: O scroll só reage a mudanças no `pathname`, não em query parameters

---

## Solução

### Parte 1: Melhorar o Componente ScrollToTop

Atualizar `src/components/ScrollToTop.tsx` para:
- Usar `behavior: 'instant'` para scroll imediato
- Adicionar fallback com `setTimeout` para garantir execução
- Incluir `location.key` como dependência para capturar todas as navegações

```typescript
useEffect(() => {
  // Scroll imediato
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  
  // Fallback para garantir em mobile
  const timeoutId = setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, 0);
  
  return () => clearTimeout(timeoutId);
}, [pathname]);
```

### Parte 2: Remover Duplicação no PublicSiteLayout

No `PublicSiteLayout.tsx`, remover o `window.scrollTo(0, 0)` do useEffect para evitar conflito com o componente ScrollToTop global.

O useEffect deve ficar apenas:
```typescript
useEffect(() => {
  setMobileMenuOpen(false);
  // Scroll handled by ScrollToTop component
}, [location.pathname]);
```

### Parte 3: Adicionar onClick nos Links do Rodapé

Adicionar `onClick` handler nos links do footer para forçar scroll mesmo quando navegando para a mesma página:

```typescript
<Link 
  to={getHref(link.href)}
  onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
  className="..."
>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/ScrollToTop.tsx` | Melhorar lógica de scroll com behavior instant e fallback |
| `src/pages/public/PublicSiteLayout.tsx` | Remover scroll duplicado e adicionar onClick nos links do footer |

---

## Resultado Esperado

- Clicar em qualquer link do rodapé → página vai instantaneamente para o topo
- Funciona no iPhone, Android e desktop
- Funciona no modo preview e no site publicado
- Sem conflitos ou comportamento estranho de scroll
