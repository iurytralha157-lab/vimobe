# Configuração da Integração Instagram no CRM

Vi pelas imagens que você configurou o caso de uso **"Gerenciar mensagens e conteúdo no Instagram"** com a **API do Instagram (Instagram Business Login)** — que é um fluxo **diferente** do Facebook Login. Isso muda o que precisamos fazer no app.

## O que mudou na sua configuração Meta

Você habilitou um app **separado** para o Instagram (`Vimob-IG`, ID `795281143425966`) com escopos novos:
- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`

Esses escopos **não funcionam** no fluxo OAuth atual do nosso CRM (que é via `facebook.com/dialog/oauth`). Eles exigem o endpoint `instagram.com/oauth/authorize`.

## O que precisa ser feito no app

### 1. Adicionar secrets do app Instagram
Criar dois novos secrets no Supabase:
- `META_INSTAGRAM_APP_ID` = `795281143425966`
- `META_INSTAGRAM_APP_SECRET` = (a "Chave secreta do app do Instagram" mostrada na tela)

### 2. Nova edge function: `instagram-oauth`
Fluxo separado do Facebook, usando endpoints corretos do Instagram:
- Auth URL: `https://www.instagram.com/oauth/authorize` com escopos `instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments`
- Token exchange: `https://api.instagram.com/oauth/access_token`
- Long-lived token: `https://graph.instagram.com/access_token?grant_type=ig_exchange_token`
- Buscar dados da conta: `https://graph.instagram.com/v21.0/me?fields=id,username,account_type`
- Salvar token e `instagram_user_id` em `meta_integrations` (colunas já existem: `instagram_business_account_id`)

### 3. Atualizar `meta-oauth/index.ts`
Reverter a tentativa anterior de incluir escopos Instagram no fluxo Facebook — eles ficam **somente** no fluxo dedicado novo. Manter Facebook/WhatsApp limpos como já está.

### 4. Webhook do Instagram
Configurar no painel Meta (passo 3 da sua tela "Configurar webhooks"):
- **URL de callback**: `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-webhook`
- **Verify token**: o mesmo valor já configurado para o Facebook (secret `META_VERIFY_TOKEN`)
- Assinar campos: `messages`, `comments`, `mentions`

Atualizar `meta-webhook/index.ts` para tratar payloads com `object: "instagram"` (estrutura diferente do Facebook Page) e gravar leads/mensagens.

### 5. UI — `MetaIntegrationSettings.tsx`
- Botão **"Conectar Instagram"** chama a nova edge function `instagram-oauth` (não mais `meta-oauth` com flag).
- Após conectar, listar a conta IG vinculada e permitir escolher pipeline/estágio para leads gerados via DM/comentários.

### 6. Passo 4 do painel Meta — "Configurar o login da empresa no Instagram"
Você precisa clicar em **Configurar** ali e definir:
- **URI de redirecionamento OAuth válido**: `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/instagram-oauth`
- **URI de cancelamento**: mesmo valor
- **URI de desautorização**: mesmo valor
- **URI de exclusão de dados**: mesmo valor

## Status das outras integrações
Facebook Lead Ads e WhatsApp **continuam funcionando normalmente** — esse plano só **adiciona** o canal Instagram, sem mexer nos fluxos existentes.

## Pré-requisitos seus (fora do app)
1. Conta Instagram precisa ser **Business ou Creator** vinculada à Página do Facebook.
2. Após implementarmos, você adiciona a conta no passo 2 ("Adicionar conta") do painel.
3. Para uso em produção (clientes externos), é preciso submeter os escopos `instagram_business_*` no **App Review**. Em modo Dev, funciona só com contas de teste/admins do app.

---

Posso seguir? Se sim, vou precisar que você me passe o **App Secret do Instagram** (campo "Chave secreta do app do Instagram" na imagem) para eu adicionar como secret.