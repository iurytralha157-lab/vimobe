## Diagnóstico

Investiguei o fluxo completo de recebimento de imagens e encontrei **a causa raiz** do problema.

### O que está acontecendo
- ✅ O `base64` está **ATIVO** e configurado na Evolution.
- ✅ As imagens que vêm com base64 inline no webhook **estão sendo salvas com sucesso** no Supabase Storage (verifiquei: a URL pública responde HTTP 200 com JPEG válido).
- ❌ Mas existem **31 mídias presas em `pending`** (11 imagens, 18 documentos, 1 vídeo, 2 áudios) que nunca foram baixadas, nem mesmo com a estratégia de retry.

### A causa raiz
Na edge function `evolution-webhook` (linha 678), quando a mídia **não chega com base64 inline** (acontece em algumas mensagens, como mídias muito grandes ou áudios PTT), o código tenta criar um job na tabela `media_jobs` para o worker baixar depois. Mas o `INSERT` inclui o campo `remote_jid`, que **não existe** nessa tabela:

```ts
await supabase.from("media_jobs").insert({
  // ...
  remote_jid: remoteJid,   // ❌ Coluna inexistente — falha silenciosa
  message_key: key,
  // ...
});
```

O resultado: o INSERT falha, o worker nunca recebe o trabalho, e a mídia fica **eternamente travada** em `pending`. Por isso você vê algumas imagens carregando direto e outras simplesmente não abrem.

Confirmei isso porque a tabela `media_jobs` só tem **1 job desde 5 de abril** (e ele falhou), enquanto temos 31 mídias pendentes recentes.

---

## Plano de correção

### 1. Corrigir o INSERT em `media_jobs` (correção principal)
Remover o campo `remote_jid` do INSERT na função `evolution-webhook` (linha ~678), que está causando a falha silenciosa. O `remoteJid` já vem dentro de `message_key`, então não precisamos do campo separado.

### 2. Tornar o erro visível (defesa em profundidade)
Quando o INSERT em `media_jobs` falhar, marcar a mensagem com `media_error` explicando o motivo. Isso faz aparecer o botão "Tentar novamente" no balão da imagem em vez do estado eterno de "Carregando mídia...".

### 3. Reprocessar as 31 mídias presas
Criar uma migration que:
- Cria jobs de mídia para todas as mensagens com `media_status = 'pending'` e `media_url IS NULL` mais recentes (últimos 7 dias).
- Dispara o `media-worker` uma vez logo após para processá-las imediatamente.

### 4. Melhorar diagnóstico do thumbnail (bonus)
Quando o webhook recebe uma imagem sem base64, salvar o `jpegThumbnail` (que sempre vem inline na mensagem) como pré-visualização imediata. Assim o usuário vê pelo menos uma miniatura enquanto o worker baixa a versão final em alta resolução.

### 5. Testar
- Enviar uma imagem nova de WhatsApp e confirmar que aparece e abre normal.
- Verificar que as mídias antes presas em `pending` agora aparecem.
- Confirmar nos logs do `evolution-webhook` que a mensagem `Media job created for retry` aparece (sem erro).

---

## Resultado esperado
- Todas as imagens novas vão chegar e abrir corretamente.
- Mídias que chegam sem base64 inline (raras, mas acontece) serão processadas pelo worker em até 2 minutos.
- Pendências antigas serão recuperadas no momento da migration.
- Quando algo der errado, o usuário vê um botão "Tentar novamente" em vez de loading eterno.