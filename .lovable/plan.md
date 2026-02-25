
# Corrigir Baloes de Chat Cortados e Scroll Indo ao Topo

## Problemas Identificados

### 1. Baloes cortados nas laterais
Os componentes de audio e documento dentro do `MessageBubble` tem `min-w-[280px]` e `min-w-[220px]`, que podem ultrapassar o `max-w-[75%]` do container (especialmente no FloatingChat de 420px onde 75% = 315px). Combinado com `overflow-hidden` no balao, isso causa o corte visual.

### 2. Scroll vai para o topo ao abrir conversa
O efeito que roda ao trocar de conversa (linha 172-178) faz `scrollIntoView` antes das mensagens carregarem. Quando as mensagens chegam, o ScrollArea dispara eventos de scroll durante o render, setando `isUserScrollingRef.current = true` (porque o usuario esta no topo, nao no fundo). Isso impede o auto-scroll posterior que deveria levar ao fundo.

## Solucao

### Arquivo: `src/components/whatsapp/MessageBubble.tsx`

1. **Trocar `min-w-[280px]` por `min-w-0 w-full`** no audio player (linha 347) -- deixar o waveform se adaptar ao container
2. **Trocar `min-w-[260px]` por `min-w-0 w-full`** no fallback de audio com erro (linha 305)
3. **Trocar `min-w-[220px]` por `min-w-0 w-full`** no documento (linha 583)
4. **Trocar `min-w-[200px]` por `min-w-[180px]`** nos estados de pending/failed/image fallback
5. **Reduzir waveform bars de 40 para 28** para caber melhor em telas menores

### Arquivo: `src/components/chat/FloatingChat.tsx`

1. **Corrigir scroll para baixo**: No efeito de troca de conversa (linha 172-178), usar um `setTimeout` com delay para garantir que as mensagens ja renderizaram antes de fazer scroll
2. **Proteger contra scroll events falsos**: No efeito de mensagens novas (linha 152-169), quando `previousLength === 0` (primeira carga), forcar scroll sem checar `isUserScrollingRef` -- e so comecar a respeitar o flag apos a primeira carga
3. **Adicionar `overflow-x-hidden`** no container de mensagens (linha 671) para prevenir scroll horizontal

### Detalhes tecnicos

**MessageBubble - Audio player (linha 347):**
```
// De:
"flex items-center gap-2 py-1.5 px-2 min-w-[280px]"
// Para:
"flex items-center gap-2 py-1.5 px-2 min-w-0 w-full"
```

**FloatingChat - Scroll fix (linhas 152-178):**
```typescript
// Efeito de mensagens novas - forcar scroll na primeira carga
useEffect(() => {
  const currentLength = messages?.length || 0;
  const previousLength = previousMessagesLengthRef.current;
  
  if (currentLength > previousLength || previousLength === 0) {
    // Na primeira carga, SEMPRE scrollar (ignorar isUserScrollingRef)
    const isFirstLoad = previousLength === 0;
    if (isFirstLoad || !isUserScrollingRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isFirstLoad ? "instant" : "smooth"
        });
        // Resetar flag apos primeira carga
        if (isFirstLoad) {
          isUserScrollingRef.current = false;
        }
      }, 50);
    }
  }
  
  previousMessagesLengthRef.current = currentLength;
}, [messages?.length]);
```

**FloatingChat - Container de mensagens (linha 671):**
```
// De:
"px-3 py-3 w-full max-w-full min-w-0 overflow-hidden"
// Para:
"px-3 py-3 w-full max-w-full min-w-0 overflow-hidden overflow-x-hidden"
```
