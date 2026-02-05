
# Plano: Usar MessageBubble Completo no FloatingChat

## Problema Identificado
O chat flutuante (`FloatingChat`) não exibe mensagens de áudio, imagens ou arquivos corretamente porque usa um componente interno simplificado (`ChatMessageBubble`) em vez do componente completo (`MessageBubble`) que existe em `src/components/whatsapp/MessageBubble.tsx`.

## Comparativo

| Funcionalidade | ChatMessageBubble (FloatingChat) | MessageBubble (Conversations) |
|----------------|----------------------------------|-------------------------------|
| Imagens | Link simples, sem zoom | Visualizador com zoom e download |
| Áudio | `<audio controls>` básico | Player com waveform, velocidade, progresso |
| Vídeo | `<video controls>` básico | Visualizador fullscreen |
| Documentos | Link simples | Card estilizado com download |
| Status de mídia | ❌ Não suporta | ✅ pending/ready/failed |
| Retry de mídia | ❌ Não suporta | ✅ Botão de retry |

## Solução
Remover o componente `ChatMessageBubble` interno do `FloatingChat` e substituí-lo pelo `MessageBubble` importado de `@/components/whatsapp/MessageBubble.tsx`.

## Arquivo a Modificar
- `src/components/chat/FloatingChat.tsx`

## Mudanças

### 1. Adicionar import do MessageBubble
```tsx
import { MessageBubble } from "@/components/whatsapp/MessageBubble";
```

### 2. Substituir uso do ChatMessageBubble pelo MessageBubble
No trecho onde as mensagens são renderizadas (linha ~684):

```tsx
// DE:
<ChatMessageBubble message={msg} isGroup={activeConversation!.is_group} />

// PARA:
<MessageBubble
  content={msg.content}
  messageType={msg.message_type}
  mediaUrl={msg.media_url}
  mediaMimeType={msg.media_mime_type}
  mediaStatus={msg.media_status as 'pending' | 'ready' | 'failed' | null}
  mediaError={msg.media_error}
  fromMe={msg.from_me}
  status={msg.status}
  sentAt={msg.sent_at}
  senderName={msg.sender_name}
  isGroup={activeConversation!.is_group}
/>
```

### 3. Remover o componente ChatMessageBubble
Deletar a função `ChatMessageBubble` (linhas 900-999) que não será mais usada.

## Resultado Esperado
- O chat flutuante exibirá imagens clicáveis com zoom e download
- Áudios terão o player completo com waveform e controles de velocidade
- Vídeos terão visualizador fullscreen
- Documentos terão card estilizado
- Mídia pendente mostrará loading spinner
- Mídia com falha terá botão de retry
