
# Plano: Corrigir Exibição de Imagens no Chat

## Problema Identificado
As imagens não estão aparecendo no chat (tanto no FloatingChat quanto possivelmente na página principal de Conversations). Após análise, o código está correto em termos de estrutura - o `MessageBubble` está recebendo `mediaUrl` e `mediaStatus` corretamente.

## Causa Raiz
O atributo `crossOrigin="anonymous"` nas tags `<img>` e `<video>` no componente `MessageBubble` está causando falhas de CORS. Quando esse atributo está presente:

1. O navegador faz uma requisição CORS preflight
2. O servidor Supabase Storage precisa retornar headers `Access-Control-Allow-Origin`
3. Se os headers não estiverem configurados corretamente para o domínio de preview, a imagem falha em carregar

O bucket `whatsapp-media` está configurado como público, então as imagens SÃO acessíveis - mas apenas sem requisições CORS.

## Solução
Remover o atributo `crossOrigin="anonymous"` dos elementos `<img>` e `<video>` no componente `MessageBubble`. Este atributo:

- Só é necessário quando você quer manipular pixels da imagem via canvas
- NÃO é necessário apenas para exibir imagens
- O download continuará funcionando porque abre em nova aba

## Arquivo a Modificar
- `src/components/whatsapp/MessageBubble.tsx`

## Mudanças Específicas

### 1. Imagem (linha 520)
```tsx
// DE:
<img
  src={mediaUrl!}
  alt={content || "Imagem"}
  className="w-full h-auto object-cover"
  crossOrigin="anonymous"  // REMOVER
  onError={handleImageError}
  onLoad={handleImageLoad}
/>

// PARA:
<img
  src={mediaUrl!}
  alt={content || "Imagem"}
  className="w-full h-auto object-cover"
  onError={handleImageError}
  onLoad={handleImageLoad}
/>
```

### 2. Vídeo (linha 568)
```tsx
// DE:
<video
  src={mediaUrl!}
  className="w-full h-auto"
  preload="metadata"
  crossOrigin="anonymous"  // REMOVER
/>

// PARA:
<video
  src={mediaUrl!}
  className="w-full h-auto"
  preload="metadata"
/>
```

### 3. MediaViewer - Imagem (arquivo MediaViewer.tsx, linha 89)
```tsx
// DE:
<img
  src={src}
  crossOrigin="anonymous"  // REMOVER
  onError={handleError}
  ...
/>

// PARA:
<img
  src={src}
  onError={handleError}
  ...
/>
```

### 4. MediaViewer - Vídeo (arquivo MediaViewer.tsx, linha 99)
```tsx
// DE:
<video
  src={src}
  crossOrigin="anonymous"  // REMOVER
  ...
/>

// PARA:
<video
  src={src}
  ...
/>
```

## Resultado Esperado
- Imagens e vídeos carregarão corretamente no chat
- O download continuará funcionando (abre em nova aba)
- O zoom de imagens funcionará normalmente
- A experiência será consistente tanto no FloatingChat quanto na página principal

## Observação
Se futuramente for necessário usar `crossOrigin` (por exemplo, para manipulação via canvas), será preciso configurar os headers CORS no bucket do Supabase Storage através do dashboard do Supabase.
