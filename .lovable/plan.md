

## Duas Melhorias no Painel Lateral de Conversas WhatsApp

### 1. Botao de Link do Criativo na Seção de Campanha

Na seção "Origem" do `ConversationLeadPanel.tsx`, quando existir `meta.creative_url`, adicionar um botao "Ver Criativo" que abre o link em nova aba.

**Arquivo:** `src/components/whatsapp/ConversationLeadPanel.tsx`
- Importar icone `ExternalLink` do lucide-react
- Depois do bloco de `meta.ad_name` (linha ~335), verificar se `meta.creative_url` existe
- Renderizar um botao compacto com icone `ExternalLink` + texto "Ver Criativo" que faz `window.open(meta.creative_url, '_blank')`

### 2. Adicionar Valor de Interesse, Imovel, Campanha e Observacoes no Painel

**Arquivo:** `src/hooks/use-conversation-lead-detail.ts`
- Adicionar `property_id`, `interest_property_id` na query do lead para poder vincular imoveis

**Arquivo:** `src/components/whatsapp/ConversationLeadPanel.tsx`
- Importar `useProperties` e `useUpdateLead`
- Importar `Input`, `Select` components

**Seção "Valor de Interesse" (editavel):**
- Substituir a seção atual read-only por um campo `Input` com mascara de moeda pt-BR
- Salvar via `updateLead.mutate` no `onBlur`

**Seção "Imovel de Interesse":**
- Adicionar um `Select` dropdown listando os imoveis da organizacao (via `useProperties`)
- Ao selecionar um imovel, preencher automaticamente o valor de interesse com o preco do imovel (mesmo padrao do LeadDetailDialog)
- Salvar imediatamente via `updateLead.mutate`

**Seção "Campanha" (dentro da area de Origem):**
- Ja existe mas apenas mostra nome da campanha e anuncio
- Adicionar o botao do criativo conforme item 1

**Seção "Observacoes do Contato":**
- Abaixo da seção de Origem, se `meta.contact_notes` existir, exibir as observacoes em um card estilizado (similar ao padrao do `LeadTrackingSection`)

### Detalhes Tecnicos

```text
Arquivos modificados:
1. src/hooks/use-conversation-lead-detail.ts  
   - Adicionar property_id, interest_property_id na query SELECT

2. src/components/whatsapp/ConversationLeadPanel.tsx
   - Importar useProperties, Input, ExternalLink
   - Adicionar estado local para valor_interesse editavel
   - Seção editavel de valor de interesse com mascara moeda
   - Seção de seletor de imovel (Select com lista de properties)
   - Botao "Ver Criativo" quando creative_url existe
   - Seção de observacoes do contato quando contact_notes existe
```

### Fluxo de UX

1. Usuario abre conversa WhatsApp com lead vinculado
2. No painel lateral direito, alem de status/estagio/tags, agora ve:
   - Seletor de imovel de interesse (dropdown)
   - Campo editavel de valor de interesse (com mascara R$)
   - Dados de campanha com botao "Ver Criativo" abrindo link externo
   - Observacoes do contato vindas do formulario/webhook

