
# Buscar Link do Criativo do Meta Ads

## Resumo
Adicionar busca automatica do link do criativo (imagem/video do anuncio) via Graph API usando o `ad_id` que ja e capturado no webhook, salvar na tabela `lead_meta` e exibir na secao de rastreamento do lead.

## Viabilidade
- O OAuth ja solicita o escopo `ads_management`, que permite ler dados de anuncios
- O `ad_id` ja e salvo no `lead_meta`
- A Graph API expoe o endpoint `GET /{ad_id}?fields=creative{effective_image_url,effective_object_story_id,thumbnail_url}` para obter a URL do criativo

## Etapas

### 1. Migration: Adicionar coluna `creative_url` na tabela `lead_meta`

```sql
ALTER TABLE public.lead_meta
ADD COLUMN IF NOT EXISTS creative_url TEXT;
```

### 2. Edge Function `meta-webhook`: Buscar criativo apos obter dados do lead

Apos a chamada que ja busca os dados do lead (linha 140-146), adicionar uma segunda chamada a Graph API para buscar o criativo quando `ad_id` existir:

```
GET /{ad_id}?fields=creative{effective_image_url,thumbnail_url}&access_token=...
```

- Usar `effective_image_url` como valor principal (URL da imagem em tamanho real)
- Fallback para `thumbnail_url` se `effective_image_url` nao estiver disponivel
- Em caso de erro na busca do criativo, apenas logar o erro e continuar (nao bloquear a criacao do lead)
- Salvar o resultado no campo `creative_url` do `lead_meta`

### 3. Componente `LeadTrackingSection`: Exibir o criativo

Na secao "Dados da Campanha", adicionar uma linha com preview do criativo:
- Se `creative_url` existir, mostrar uma miniatura clicavel (abre em nova aba)
- Usar um icone de imagem com label "Criativo"
- A imagem tera tamanho compacto (max 200px de largura) com bordas arredondadas

### 4. Hook `use-lead-meta.ts`: Atualizar interface

Adicionar `creative_url: string | null` na interface `LeadMeta`.

---

## Detalhes Tecnicos

### Arquivo: `supabase/functions/meta-webhook/index.ts`
- Local: apos linha 146 (apos `const leadData = ...`)
- Logica: se `leadData.ad_id` existir, fazer fetch do criativo
- A URL sera passada na insercao do `lead_meta` (linha 450-465)

### Arquivo: `src/hooks/use-lead-meta.ts`
- Adicionar campo `creative_url` na interface

### Arquivo: `src/components/leads/LeadTrackingSection.tsx`
- Na secao de campanha, apos os campos existentes (Campanha, Conjunto, Anuncio, Formulario), adicionar bloco condicional com preview da imagem

### Tratamento de erros
- A busca do criativo e opcional - se falhar, o lead continua sendo criado normalmente
- Alguns anuncios podem nao ter criativo (ex: Dynamic Ads) - nesses casos o campo fica null
- O token de pagina (`page_access_token`) deve funcionar para buscar criativos de anuncios vinculados a pagina
