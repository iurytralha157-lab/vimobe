
# Corrigir Baloes de Mensagem Cortados na Lateral

## Problema

As mensagens enviadas (laranja, lado direito) estao sendo cortadas na borda direita do chat. O texto aparece parcialmente oculto, como "Ta onde rapaz?" e "Kkkk" aparecendo cortados.

## Causa Raiz

Dois fatores contribuem:

1. **`max-w-[65%]`** no balao e muito largo para o container do FloatingChat (420px desktop / mobile drawer). Combinado com `px-4` (16px cada lado), sobra ~388px uteis, e 65% disso e ~252px -- mas o `ScrollArea` pode nao respeitar o padding corretamente no calculo de largura.

2. **Spacer invisivel de 70px** (`<span className="inline-block w-[70px]">`) dentro do texto forca o balao a ser mais largo do que o necessario, podendo ultrapassar o container.

3. O **`ScrollArea`** aplica `overflow-x: hidden` no viewport, mas o conteudo interno pode ultrapassar os limites antes do clipping, causando o corte visual.

## Solucao

### 1. MessageBubble - Ajustar largura maxima e spacer

No arquivo `src/components/whatsapp/MessageBubble.tsx`:

- Reduzir o spacer invisivel de `w-[70px]` para `w-[60px]`
- Adicionar `overflow-hidden` no container do balao para garantir que nenhum conteudo vaze

### 2. FloatingChat - Garantir que o container de mensagens respeite os limites

No arquivo `src/components/chat/FloatingChat.tsx`:

- Adicionar `overflow-x-hidden` e `w-full max-w-full` no wrapper das mensagens dentro do `ScrollArea`
- Garantir que o div com `px-4 py-3` tenha `min-w-0` para evitar que flex items expandam alem do container

## Detalhes Tecnicos

### Arquivo: `src/components/whatsapp/MessageBubble.tsx`

**Linha ~390 (container do balao)**:
Alterar de:
```
max-w-[65%] rounded-lg px-2 py-1.5 relative
```
Para:
```
max-w-[75%] rounded-lg px-2 py-1.5 relative overflow-hidden
```

Aumentar para 75% pois o container ja e pequeno (420px), e adicionar `overflow-hidden` como seguranca.

**Linha ~401 (spacer invisivel)**:
Alterar de:
```
<span className="inline-block w-[70px]"></span>
```
Para:
```
<span className="inline-block w-[60px]"></span>
```

### Arquivo: `src/components/chat/FloatingChat.tsx`

**Linha ~671 (wrapper de mensagens no ScrollArea)**:
Alterar de:
```
<div className="px-4 py-3">
```
Para:
```
<div className="px-3 py-3 w-full max-w-full min-w-0 overflow-hidden">
```

Reduzir padding lateral de 16px para 12px para dar mais espaco aos baloes, e adicionar constraints de largura.
