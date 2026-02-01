
# Plano: Scroll para o Topo ao Navegar

## Problema
Quando o usuário navega entre páginas no site imobiliário (público ou preview), a página abre na posição de scroll anterior ao invés de começar do topo. Isso acontece tanto no desktop quanto no mobile.

## Causa
O React Router mantém a posição de scroll entre navegações. Isso é comportamento padrão em SPAs (Single Page Applications) e precisa ser corrigido manualmente.

## Solução
Criar um componente `ScrollToTop` que detecta mudanças de rota e automaticamente rola a janela para o topo.

---

## Implementação

### Parte 1: Criar Componente ScrollToTop

Novo arquivo `src/components/ScrollToTop.tsx`:

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
```

### Parte 2: Aplicar no Site Público

Adicionar o componente em dois locais para cobrir todos os cenários:

1. **`PublicSiteLayout.tsx`** - Para navegação dentro do site público
   - Usar `useEffect` com `location.pathname` para scroll automático

2. **`PreviewSiteWrapper.tsx`** - Para o modo preview
   - Incluir `<ScrollToTop />` dentro das rotas

### Parte 3: Aplicar no App Principal (opcional)

Adicionar no `App.tsx` para todas as rotas do sistema, garantindo que o CRM também se beneficie.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/ScrollToTop.tsx` | **CRIAR** - Componente reutilizável |
| `src/pages/public/PublicSiteLayout.tsx` | Adicionar scroll to top no useEffect |
| `src/pages/public/PreviewSiteWrapper.tsx` | Importar e usar ScrollToTop |
| `src/App.tsx` | Importar e usar ScrollToTop (global) |

---

## Resultado Esperado

- Ao clicar em um imóvel na listagem → página abre no topo
- Ao navegar para "Contato" → página abre no topo
- Ao voltar para "Imóveis" → página abre no topo
- Funciona em mobile e desktop
- Funciona no preview e no site publicado
