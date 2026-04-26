## Diagnóstico

Encontrei a causa mais provável do carregamento infinito.

Hoje a mensagem de mídia chega no webhook com dados suficientes para salvar o arquivo, mas o fluxo está deixando algumas mensagens em `media_status = 'pending'` indefinidamente.

Exemplo real da conversa com André Rocha:

- Mensagem de imagem `3ABC2C5B962A16AFDE57`
- Está no banco como `media_status = pending`, sem `media_url`
- O `media-worker` tenta buscar no endpoint `getBase64FromMediaMessage`
- A Evolution responde: `400 Message not found`
- Como ainda não chegou no número máximo de tentativas, a UI fica mostrando “Carregando mídia...”

Também vi nos logs que a Evolution às vezes envia o `base64` no próprio webhook, mas ele pode estar em outro nível do payload. O código atual só procura em poucos lugares:

```ts
message.imageMessage.base64 || messageData.base64 || payload?.base64
```

Nos logs recentes apareceu `base64` dentro de `data.message`, não necessariamente nesses caminhos. Quando o sistema não encontra esse base64, ele agenda o worker. Aí o worker consulta a Evolution depois e recebe “Message not found”. Resultado: loading infinito.

Outro problema: o código criou uma regra para não processar `sticker`, então figurinha pode nunca virar mídia reproduzível.

## Plano de correção

### 1. Capturar base64 do webhook de forma robusta
Criar um helper único para extrair base64 de todos os formatos comuns da Evolution:

- `message.imageMessage.base64`
- `message.audioMessage.base64`
- `message.videoMessage.base64`
- `message.documentMessage.base64`
- `message.stickerMessage.base64`
- `message.base64`
- `messageData.base64`
- `payload.base64`
- possíveis estruturas aninhadas como `data.message.base64`

Se o base64 veio no webhook, salvar imediatamente no Supabase Storage e marcar `media_status = ready`.

### 2. Corrigir sticker e mídia recebida
Incluir `sticker` no pipeline de mídia:

- `stickerMessage` deve usar `message_type = 'sticker'`
- MIME padrão: `image/webp`
- Deve salvar no Storage igual imagem
- Deve ser exibida na UI como imagem/webp

### 3. Eliminar loading infinito
Alterar a regra do `media-worker`:

- Se a Evolution responder `Message not found`, marcar a mídia como `failed` com `media_error` claro, sem esperar 5 tentativas longas.
- Se falhar por motivo recuperável, manter retry.
- Na UI, deixar de mostrar loading eterno; se a mensagem ficar `pending` por tempo demais, exibir “Mídia demorando para processar” com botão “Tentar novamente”.

### 4. Melhorar fallback para imagem com thumbnail
Quando uma imagem não tiver base64 final mas tiver `jpegThumbnail`, salvar o thumbnail como preview temporário no Storage e exibir algo visual em vez de loader vazio.

- `media_status` pode continuar `pending` enquanto tenta buscar a versão final.
- Mas a UI terá uma miniatura para mostrar.
- Se a versão final falhar, a mensagem não fica visualmente travada.

### 5. Ajustar a chamada do `getBase64FromMediaMessage`
Testar duas variações do body da Evolution, porque a própria documentação mostra apenas `{ key: { id } }`, enquanto hoje estamos mandando a chave completa:

```ts
{ message: { key: fullKey }, convertToMp4: messageType === 'video' }
```

Adicionar fallback seguro:

```ts
{ message: { key: { id: messageId } }, convertToMp4: messageType === 'video' }
```

Isso pode resolver casos onde a Evolution retorna `Message not found` por não aceitar campos extras como `remoteJidAlt`, `addressingMode` ou `participant` vazio.

### 6. Validar bytes antes de gravar
Manter e reforçar a validação atual:

- JPEG começa com `FFD8FF`
- PNG começa com `89504E47`
- WEBP começa com `RIFF` e contém `WEBP`
- OGG começa com `OggS`
- PDF começa com `%PDF`
- MP4 precisa conter `ftyp` nos primeiros bytes

Se não bater com o MIME esperado, não salvar como mídia pronta.

### 7. Reprocessar pendências recentes
Depois da correção:

- Rodar o `media-worker` em modo `scan_orphans`
- Recriar jobs corretos para mídias pendentes recentes
- Para as que têm base64 nos logs não dá para recuperar pelo banco, mas as próximas recebidas já entram certas.
- Para as que a Evolution ainda conseguir localizar, o worker baixará e salvará.

## Resultado esperado

Após implementar:

- Imagens, áudios, vídeos, documentos e figurinhas recebidos com base64 no webhook serão salvos direto no Storage.
- O sistema não dependerá do `getBase64FromMediaMessage` quando a própria Evolution já entregou o base64.
- Quando a Evolution realmente não entregar base64 e também não encontrar a mensagem depois, o chat mostrará erro com botão de retry, não loading infinito.
- Imagens com thumbnail terão preview visual enquanto processam.
- O fluxo ficará simples: webhook recebe mídia → decodifica base64 → valida assinatura → salva no Storage → banco recebe URL pronta → chat reproduz.