

# Fix: Chat Scroll Jumps to Top on Typing + Media Overflow

## Problems

### 1. Scroll jumps to top when typing
`MessagesView` is defined as a **function component inside the render body** of `FloatingChat`. Every keystroke in the textarea calls `setMessageText`, which re-renders `FloatingChat`, which creates a **new `MessagesView` function reference**. React sees a different component type each render and **unmounts/remounts** the ScrollArea — destroying scroll position.

### 2. Media bubbles overflow the chat container
The "Imagem não disponível" fallback boxes use `min-w-[200px]` and `p-6` which can push content beyond the chat's visible area. Images and videos use `max-w-[280px]` without constraining to the bubble's width, causing horizontal overflow in the 420px floating chat.

## Fix

### File: `src/components/chat/FloatingChat.tsx`

**Scroll fix**: Convert `MessagesView` from an inline component (`const MessagesView = () => ...` used as `<MessagesView />`) to **inline JSX** directly in the render tree. This prevents React from unmounting/remounting the scroll container on every keystroke.

Before:
```tsx
const MessagesView = () => <div>...</div>;
// used as <MessagesView />
```

After:
```tsx
// Inline the JSX directly where <MessagesView /> was used
{activeConversation ? (
  <>
    <div className="flex-1 overflow-hidden min-h-0 flex flex-col bg-card">
      <ScrollArea ...>
        ...
      </ScrollArea>
    </div>
    {renderMessageInput()}
  </>
) : ...}
```

This applies to both mobile and desktop render paths (lines ~861 and ~889).

### File: `src/components/whatsapp/MessageBubble.tsx`

**Overflow fix**: 
- Change image/video containers from `max-w-[280px]` to `max-w-full` so they respect the parent bubble's `max-w-[75%]` constraint.
- Change "Imagem não disponível" fallback from `min-w-[200px]` to `w-full max-w-[200px]` to prevent overflow.
- Add `overflow-hidden` to the outer bubble wrapper to catch any remaining overflow.

### No database changes needed.

