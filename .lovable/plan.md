

## Plano: Aumentar espaço do header para acomodar logos maiores

**Problema**: O header do site público tem altura fixa de 70px e a logo é limitada a 55px de altura, o que corta logos mais altas ou horizontais.

**Solução**: Aumentar a altura do header e os limites da logo no cabeçalho.

### Alterações em `src/pages/public/PublicSiteLayout.tsx`

1. **Altura do header (desktop)**: Mudar `h-[70px]` para `h-[80px]` — mais respiro visual
2. **maxHeight da logo no desktop** (linha 188): Aumentar de `55` para `70`
3. **maxWidth da logo no desktop** (linha 187): Aumentar de `260` para `320`
4. **maxHeight da logo no mobile** (linha 307): Aumentar de `40` para `55`

Isso dá mais espaço para logos maiores sem quebrar o layout do menu de navegação.

