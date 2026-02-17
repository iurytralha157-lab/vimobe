
# Adicionar Animacoes fade-in, scale-in e slide-in ao Tailwind Config

## O que sera feito

Adicionar 6 novos keyframes e 8 novas animacoes ao `tailwind.config.ts` existente, sem alterar nenhuma cor, variavel ou configuracao atual.

## Keyframes a adicionar

| Keyframe | Descricao |
|---|---|
| `fade-in` | Aparece com translateY(10px) para cima |
| `fade-out` | Desaparece com translateY para baixo |
| `scale-in` | Aparece com scale(0.95) para 1 |
| `scale-out` | Desaparece com scale(1) para 0.95 |
| `slide-in-right` | Entra da direita (translateX 100% para 0) |
| `slide-out-right` | Sai para a direita (translateX 0 para 100%) |

## Animacoes a adicionar

| Classe | Valor |
|---|---|
| `animate-fade-in` | `fade-in 0.3s ease-out` |
| `animate-fade-out` | `fade-out 0.3s ease-out` |
| `animate-scale-in` | `scale-in 0.2s ease-out` |
| `animate-scale-out` | `scale-out 0.2s ease-out` |
| `animate-slide-in-right` | `slide-in-right 0.3s ease-out` |
| `animate-slide-out-right` | `slide-out-right 0.3s ease-out` |
| `animate-enter` | `fade-in 0.3s ease-out, scale-in 0.2s ease-out` (combinada) |
| `animate-exit` | `fade-out 0.3s ease-out, scale-out 0.2s ease-out` (combinada) |

## Detalhes Tecnicos

### Arquivo modificado
- `tailwind.config.ts`

### Local exato
- Bloco `keyframes` (linhas 125-164): adicionar os 6 novos keyframes apos `drawer-slide-up`
- Bloco `animation` (linhas 166-172): adicionar as 8 novas animacoes apos `drawer-slide-up`

### O que permanece inalterado
- Todas as cores (primary, kanban, chart, chatBubble, etc.)
- Todas as variaveis CSS
- Keyframes existentes (accordion-down, accordion-up, shimmer, pulse, drawer-slide-up)
- Animacoes existentes
- Fonts, borderRadius, boxShadow, plugins
