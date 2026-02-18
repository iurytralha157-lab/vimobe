
# Corrigir Scroll do Formulario de Criacao de Lead no Mobile

## Problema

O dialogo de criacao de lead usa `max-h-[85vh]` mas no mobile o conteudo fica cortado sem possibilidade de scroll. A aba "Perfil" tem muitos campos (Cargo, Empresa, Profissao, Renda Familiar, Faixa de Imovel, Valor de Interesse, etc.) que ficam inacessiveis.

## Causa Raiz

O `ScrollArea` do Radix precisa de uma altura explicita para funcionar. Atualmente ele tem `className="flex-1"` que depende do flex container, mas o `DialogContent` no mobile pode nao estar respeitando o `max-h-[85vh]` corretamente porque o componente base do dialog usa posicionamento `fixed` com `translate` que pode interferir com o calculo de altura.

## Solucao

Duas alteracoes simples no `CreateLeadDialog.tsx` (linha 223 e 232):

1. **DialogContent**: Forcar altura maxima consistente no mobile adicionando `h-[85vh] sm:h-auto sm:max-h-[85vh]` e garantindo `overflow-hidden`
2. **ScrollArea**: Adicionar `overflow-y-auto` como fallback e garantir que o container flex funcione com `min-h-0`

### Mudanca concreta

```
// Linha 223 - DialogContent
className={`max-w-lg p-0 flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] overflow-hidden`}

// Linha 232 - ScrollArea  
<ScrollArea className="flex-1 min-h-0">
```

Isso forca o dialogo a ter altura fixa no mobile (85vh), permitindo que o ScrollArea ocupe o espaco restante e habilite o scroll interno. O footer com os botoes permanece fixo na parte inferior.

## Arquivo afetado

- `src/components/leads/CreateLeadDialog.tsx` (2 linhas)
