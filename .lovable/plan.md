

# Auditoria de Mídias WhatsApp - Diagnóstico Completo

## Resumo do Problema

O sistema de mídia **FUNCIONA PARA IMAGENS RECENTES** (5.985 imagens OK), mas há **494 mídias pendentes** antigas e alguns tipos específicos que não estão sendo processados.

---

## Estado Atual do Sistema

| Tipo | Status | Total | Período |
|------|--------|-------|---------|
| image/jpeg | ✅ ready | 5.985 | Funcionando |
| audio/ogg | ✅ ready | 3.525 | Funcionando |
| application/pdf | ✅ ready | 902 | Funcionando |
| video/mp4 | ✅ ready | 482 | Funcionando |
| image/jpeg | ⚠️ pending | 397 | Antigos (20-23 Jan) |
| audio/ogg | ⚠️ pending | 40 | Antigos (20-23 Jan) |
| **audio/aac** | 🔴 pending | 8 | **Recentes (2-5 Fev)** |
| image/heic | 🔴 pending | 6 | Não suportado |
| video/quicktime | 🔴 pending | 2 | MOV do iPhone |

---

## Problemas Identificados

### 1. Áudios `audio/aac` Não São Processados (CRÍTICO)

Os áudios do tipo `audio/aac` ficam pendentes mesmo sendo recentes. O mapeamento de extensões no código não inclui `audio/aac`:

```typescript
// media-worker/index.ts - linha 372-380
const map: Record<string, string> = {
  "audio/ogg": "ogg",         // ✅ existe
  "audio/mpeg": "mp3",        // ✅ existe  
  "audio/mp4": "m4a",         // ✅ existe
  // ❌ FALTA: "audio/aac": "aac"
};
```

**Impacto**: Áudios AAC (formato comum do iPhone) não têm extensão correta e podem falhar.

### 2. Formatos do iPhone Não Suportados

- **image/heic**: Formato de foto do iPhone - não é suportado na web
- **video/quicktime** (.MOV): Formato de vídeo do iPhone

**Solução**: Adicionar conversão ou mensagem de "formato não suportado"

### 3. Backlog de Mídias Antigas (397 imagens + 40 áudios)

Mídias do período 20-23 de janeiro ficaram pendentes porque:
1. URLs do WhatsApp expiraram (~15 minutos de validade)
2. A Strategy 1 (getBase64) retorna "Message not found"
3. Não havia fallback automático

**Status**: Irrecuperáveis via API - URLs já expiraram.

### 4. Media-Worker Não Está Processando Jobs Pendentes

A tabela `media_jobs` está vazia, mas há 20+ mensagens pendentes recentes.

**Diagnóstico**: O webhook cria o job, mas:
- Ou não há cron job configurado
- Ou os jobs são processados e marcados como failed/completed rapidamente

---

## Fluxo Atual de Mídia

```text
1. Webhook recebe mensagem com mídia
2. Tenta baixar base64 do webhook (geralmente vazio)
3. Strategy 1: getBase64FromMediaMessage (5 tentativas)
   └── Frequentemente falha: "Message not found"
4. Strategy 2: downloadMedia endpoint
5. Strategy 3: Download direto da URL (funciona se URL ainda válida!)
6. Strategy 4: Evolution media proxy
7. Strategy 5: DirectPath CDN
8. FALLBACK: Salvar thumbnail (só para imagens)
9. Se tudo falhar → Cria media_job para retry posterior
```

---

## O Que Está Funcionando Bem

✅ **Imagens recentes**: Strategy 3 (download direto) está funcionando
✅ **Áudios OGG**: 3.525 processados corretamente  
✅ **PDFs**: 902 processados corretamente
✅ **Vídeos MP4**: 482 processados corretamente
✅ **Upload para Storage**: Funcionando corretamente
✅ **Logs detalhados**: Ótima visibilidade do que acontece

---

## Plano de Correção

### Fase 1: Correções Imediatas (30 min)

1. **Adicionar mapeamento `audio/aac`** no media-worker e webhook
2. **Adicionar mapeamento `video/quicktime`** para .mov
3. **Marcar mídias antigas irrecuperáveis** como `failed` com mensagem explicativa

### Fase 2: Melhorias de Robustez (1h)

4. **Configurar cron job** para media-worker (a cada 1 minuto)
5. **Aumentar prioridade da Strategy 3** (download direto) - é a mais confiável
6. **Adicionar suporte a HEIC** ou mensagem "formato não suportado"

### Fase 3: Tratamento de Formatos Especiais

7. **Para HEIC**: Mostrar mensagem "Baixe o arquivo para visualizar" com link
8. **Para MOV**: Tentar conversão ou mensagem similar

---

## Correções Técnicas Específicas

### 1. Atualizar getExtensionFromMime (ambos os arquivos)

```typescript
// Adicionar nos dois arquivos:
// - supabase/functions/evolution-webhook/index.ts (~linha 887)
// - supabase/functions/media-worker/index.ts (~linha 372)

const mimeExtMap: Record<string, string> = {
  // ... existentes ...
  "audio/aac": "aac",           // ← ADICIONAR
  "video/quicktime": "mov",     // ← ADICIONAR  
  "image/heic": "heic",         // ← ADICIONAR
  "text/csv": "csv",            // ← ADICIONAR
  "multipart/related": "mht",   // ← ADICIONAR
};
```

### 2. Marcar Mídias Antigas Como Irrecuperáveis

```sql
UPDATE whatsapp_messages
SET 
  media_status = 'failed',
  media_error = 'Mídia expirada - URL do WhatsApp não está mais disponível'
WHERE media_status = 'pending'
  AND sent_at < NOW() - INTERVAL '24 hours'
  AND message_type IN ('image', 'audio', 'video', 'document');
```

### 3. Melhorar Ordem das Estratégias

Mover Strategy 3 (download direto) para ANTES de Strategy 1, já que é mais rápida e confiável para mensagens recentes.

---

## Resumo

| Problema | Impacto | Esforço | Prioridade |
|----------|---------|---------|------------|
| audio/aac sem mapeamento | Áudios iPhone pendentes | 5 min | 🔴 Alta |
| MOV/HEIC não suportados | Arquivos iPhone pendentes | 15 min | 🟡 Média |
| Mídias antigas pendentes | UI mostra "carregando" | 5 min | 🟡 Média |
| Otimizar ordem de estratégias | Performance | 20 min | 🟢 Baixa |

**Quer que eu implemente essas correções?**

