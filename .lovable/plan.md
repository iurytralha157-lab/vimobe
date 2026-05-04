# Separar definitivamente Meta (Páginas + Ads) do Instagram

## Diagnóstico atual
Fui ler o código de novo agora:

- `supabase/functions/meta-oauth/index.ts` (linhas 296–305): os escopos já são **somente** de Páginas/Ads/Leads — sem nenhum `instagram_*`:
  ```
  pages_show_list, pages_read_engagement, pages_manage_ads,
  pages_manage_metadata, pages_messaging, leads_retrieval,
  ads_management, business_management
  ```
- `src/hooks/use-meta-integration.ts`: `useMetaGetAuthUrl` já roteia por `includeInstagram` → quando `false` chama `meta-oauth`, quando `true` chama `instagram-oauth`.
- `src/components/integrations/MetaIntegrationSettings.tsx`: o botão principal "Conectar" chama `handleConnect(false)` (Facebook puro), e existe um botão separado "Instagram" que chama `handleConnect(true)`.

**Ou seja: a separação já está feita no código.** O erro "Conteúdo não disponível" que você viu acontece quando aperta o botão **Instagram** (porque o app Instagram no painel Meta ainda não tem a Redirect URI configurada). O botão **principal do Facebook** deve continuar funcionando normalmente.

## O que faço no app para garantir robustez

### 1. Confirmar no UI que os dois fluxos estão claros
Em `MetaIntegrationSettings.tsx`:
- Reforçar o rótulo do botão principal para **"Conectar Facebook (Páginas + Anúncios)"**.
- Manter o botão **"Instagram"** separado, com tooltip explicando que é independente e exige o app Instagram configurado no painel Meta.
- Adicionar um aviso curto: "Se o Instagram não conectar, o Facebook continua funcionando normalmente."

### 2. Blindar o `meta-oauth` contra regressões
- Adicionar comentário explícito no topo do arquivo dizendo que **nenhum escopo `instagram_*` deve ser adicionado aqui** — esses ficam exclusivamente em `instagram-oauth`.
- Garantir que o `redirect_uri` usado no exchange do Facebook seja o callback do `meta-oauth` (não o do Instagram).

### 3. Testar o fluxo Facebook puro
Após o ajuste, vou:
- Disparar o `meta-oauth` em modo `get_auth_url` via `curl_edge_functions` para confirmar que a URL gerada aponta para `facebook.com/v19.0/dialog/oauth` sem nenhum escopo de Instagram.
- Conferir os logs da função.

### 4. Não toco em
- `instagram-oauth/index.ts` (já existe e está separado).
- `meta-webhook` (continua aceitando `object: page` e `object: instagram` independentemente).
- WhatsApp e Lead Ads — sem mudanças.

## Resumo para você
- **Sim**, são integrações separadas e já estão separadas no código.
- O botão "Conectar Facebook" deve voltar a funcionar normalmente — independente do Instagram estar ou não configurado no painel Meta.
- Quando você terminar de configurar a Redirect URI do app Instagram no painel Meta (`https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/instagram-oauth`), o botão Instagram passa a funcionar também, sem afetar o Facebook.

Posso seguir?
