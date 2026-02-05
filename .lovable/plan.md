
# Plano: Corrigir Animação de Drag-and-Drop no Dialog de Gerenciar Colunas

## Problema Identificado
Quando o usuário arrasta um item no dialog "Gerenciar Colunas", o elemento aparece deslocado (geralmente na parte de baixo ou fora de posição). Isso é visível na imagem onde o item "Base" aparece destacado fora da lista durante o drag.

## Causa Raiz
Este é um problema conhecido da biblioteca `@hello-pangea/dnd` quando usada dentro de elementos com `transform` CSS. O `DialogContent` do Radix UI usa:
```css
translate-x-[-50%] translate-y-[-50%]
```

A biblioteca `@hello-pangea/dnd` usa `position: fixed` para posicionar o elemento sendo arrastado, mas o cálculo de posição é afetado pelo `transform` do elemento pai, causando o deslocamento visual.

## Solução
Aplicar uma correção CSS ao item sendo arrastado (`snapshot.isDragging === true`) que reseta as propriedades `top` e `left` para `auto`:

```tsx
// Dentro do Draggable, modificar o style quando estiver arrastando
{(provided, snapshot) => {
  // Fix para transform parent offset
  const style = {
    ...provided.draggableProps.style,
    ...(snapshot.isDragging && {
      top: 'auto',
      left: 'auto',
    }),
  };
  
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={style}
      className={cn(...)}
    >
      ...
    </div>
  );
}}
```

## Arquivo a Modificar
- `src/components/pipelines/StagesEditorDialog.tsx`

## Detalhes Técnicos
1. Manter a estrutura existente do `Draggable`
2. Sobrescrever o `style` fornecido pelo `provided.draggableProps.style` quando `snapshot.isDragging` for `true`
3. Aplicar `top: 'auto'` e `left: 'auto'` para corrigir o offset causado pelo `transform` do Dialog
4. Esta é a solução recomendada pela comunidade para este problema específico com modais

## Resultado Esperado
- O item arrastado seguirá corretamente a posição do cursor
- Não haverá mais "salto" ou deslocamento visual durante o drag
- A experiência de reordenação das colunas será suave e intuitiva
