
# Aplicar SF Pro Display no site publico

## Situacao atual

A fonte SF Pro Display ja esta configurada como fonte padrao global (`font-sans` no Tailwind e `html` no CSS). O site publico ja herda essa fonte automaticamente na maioria dos elementos.

Porem, existem 3 lugares no `PublicSiteLayout.tsx` que usam `font-serif` (fallback quando nao tem logo), que nao usam a SF Pro Display. Vou trocar esses para `font-sans` para garantir consistencia total.

## Mudanca

### Arquivo: `src/pages/public/PublicSiteLayout.tsx`

Trocar as 3 ocorrencias de `font-serif` por `font-semibold tracking-wider` para usar SF Pro Display em todos os textos do site, mesmo nos fallbacks sem logo:

- Linha 117: Header desktop - `font-serif` para `font-semibold`
- Linha 193: Header mobile - `font-serif` para `font-semibold`
- Linha 308: Footer - `font-serif` para `font-semibold`
