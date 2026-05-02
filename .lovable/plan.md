
## Diagnóstico

O erro do Facebook "Este conteúdo não está disponível no momento — Invalid Scopes: `instagram_basic`, `instagram_manage_messages`" acontece porque, na minha última alteração, adicionei esses scopes na URL de OAuth (`supabase/functions/meta-oauth/index.ts`, linhas 296–307), mas o **App Meta de vocês ainda não tem o produto "Instagram Graph API" adicionado nem essas permissões liberadas**. Quando o Facebook recebe um scope que o App não declarou, ele bloqueia a tela inteira — por isso a integração inteira parou (Facebook + WhatsApp também).

Resposta direta às suas dúvidas:
- **As outras integrações (WhatsApp, Facebook Pages, Leads, Anúncios) NÃO estão funcionando para novas conexões** enquanto esses scopes inválidos estiverem na URL. Conexões já existentes continuam funcionando (token já foi emitido), mas qualquer **reconexão** falha.
- A correção é em duas frentes: (1) destravar agora removendo os scopes inválidos e (2) habilitar Instagram do jeito certo no painel da Meta, depois religar.

## Plano

### 1. Destravar a integração imediatamente (código)

Em `supabase/functions/meta-oauth/index.ts` (geração da `auth_url`):

- **Tornar os scopes de Instagram condicionais.** Por padrão, usar apenas o conjunto que já estava funcionando antes:
  - `pages_show_list`, `pages_read_engagement`, `pages_manage_ads`, `pages_manage_metadata`, `pages_messaging`, `leads_retrieval`, `ads_management`, `business_management`
- Adicionar um parâmetro opcional `include_instagram: boolean` no body de `get_auth_url`. Só quando ele vier `true`, anexar:
  - `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`, `pages_messaging`
- Assim a tela de Configurações > Integrações > Meta volta a abrir normalmente. Quem quiser conectar Instagram clica em um botão dedicado "Conectar Instagram" que envia `include_instagram=true`.

### 2. UI: separar visualmente WhatsApp / Facebook / Instagram

Na página de Integrações Meta (`src/pages/settings/...` que monta a lista de páginas/contas conectadas):

- Cabeçalho com 3 abas/botões com ícone: **WhatsApp**, **Facebook**, **Instagram**.
- Botão "Conectar Facebook" → chama `get_auth_url` sem Instagram.
- Botão "Conectar Instagram" → chama `get_auth_url` com `include_instagram=true` e mostra um aviso: "Requer Instagram Business vinculado a uma Página do Facebook".
- Lista de contas conectadas filtrada por plataforma, com o ícone correspondente.

### 3. Passos manuais que VOCÊ precisa fazer no painel da Meta

Sem isto, o botão "Conectar Instagram" continuará dando o mesmo erro. Não é código — é configuração do App:

1. Acesse https://developers.facebook.com/apps → seu App.
2. **Add Product** → adicionar **"Instagram Graph API"** e **"Webhooks"** (se ainda não tiver).
3. Em **App Review > Permissions and Features**, solicitar/ativar (em modo Dev já ficam disponíveis para o admin):
   - `instagram_basic`
   - `instagram_manage_messages`
   - `instagram_manage_comments`
   - `pages_messaging`
4. Em **Instagram > API Setup with Instagram Login** (ou em **Roles**) garantir que a conta de Instagram que vocês vão usar é **Instagram Business/Creator** e está **vinculada a uma Página do Facebook**. Sem esse vínculo, comentários/DMs não fluem.
5. Para sair do modo Development e funcionar com qualquer cliente, será necessário enviar o App para **App Review** com vídeo demonstrando cada permissão. Em Dev mode funciona para usuários listados como Admin/Developer/Tester.

### 4. Webhooks de comentários e mensagens (Instagram)

Depois que o passo 3 estiver feito e a reconexão funcionar:

- No painel Meta, em **Webhooks**, assinar os campos:
  - Para a **Página**: `messages`, `messaging_postbacks`, `feed` (comentários do Facebook).
  - Para **Instagram**: `comments`, `messages`, `mentions`.
- Apontar o callback para a edge function que já existe (`meta-webhook` / equivalente) — vou conferir o nome exato e atualizar a assinatura no painel.
- Testar com o **Webhooks Tester** do próprio painel antes de testar em produção.

### 5. Validação

- Reconectar Facebook (sem Instagram) → deve voltar a funcionar como antes.
- Reconectar Instagram → após passos 3/4, deve listar a conta IG Business.
- Enviar comentário de teste em um post do Instagram da conta conectada → verificar nos logs de `meta-webhook` que chegou e que foi criada conversa marcada `[COMENTÁRIO]`.
- Enviar DM no Instagram → verificar se aparece em **Conversas** sob a aba Instagram.

## Detalhes técnicos

- Arquivos alterados: `supabase/functions/meta-oauth/index.ts` (scopes condicionais) + página de integrações Meta no frontend (abas + 2 botões de conexão).
- Nada de migração de banco — `meta_integrations.instagram_business_account_id` e `selected_ad_accounts` já foram adicionadas anteriormente.
- Risco: nenhum para conexões existentes; só muda o fluxo de reconexão.
