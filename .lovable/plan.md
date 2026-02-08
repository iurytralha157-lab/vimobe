
# Plano: Auto-fechamento da Janela OAuth do Meta

## Resumo
Implementar o fechamento automático da janela de autenticação do Facebook, redirecionando o usuário de volta à página onde iniciou a conexão.

## Arquitetura Proposta

A solução segue o mesmo padrão já utilizado na integração do Google Calendar:

1. **Callback OAuth na Edge Function** - O Facebook redirecionará para a Edge Function em vez do frontend
2. **Página HTML de resposta** - A Edge Function retorna uma página que fecha a janela automaticamente
3. **Comunicação entre janelas** - Uso de `window.opener` e `postMessage` para notificar a janela pai

## Fluxo de Autenticação

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Usuário clica "Conectar Página"                                         │
│  2. Abre popup para Facebook OAuth (com state contendo return URL)          │
│  3. Facebook redireciona para Edge Function com ?code=...                   │
│  4. Edge Function troca code por token e busca páginas                      │
│  5. Edge Function retorna HTML com script que:                              │
│     - Envia postMessage para window.opener com dados das páginas            │
│     - Fecha a janela automaticamente                                        │
│  6. Janela original recebe mensagem e abre dialog de seleção de página      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

### 1. Edge Function `meta-oauth`
**Arquivo:** `supabase/functions/meta-oauth/index.ts`

Adicionar:
- Handler GET para receber callback OAuth do Facebook
- Novo action `oauth_callback` para processar o código
- Funções `generateSuccessPage()` e `generateErrorPage()` que retornam HTML
- A página de sucesso usa `window.opener.postMessage()` para enviar dados

### 2. Componente Frontend
**Arquivo:** `src/components/integrations/MetaIntegrationSettings.tsx`

Modificar:
- `handleConnect()` para usar `redirect_uri` apontando para a Edge Function
- Incluir `state` parameter com informações da sessão
- Adicionar listener de `message` para receber dados do popup
- Remover lógica atual de `useSearchParams` para callback

### 3. Hook de Integração
**Arquivo:** `src/hooks/use-meta-integration.ts`

Modificar:
- `useMetaGetAuthUrl` para gerar URL com redirect para Edge Function
- Adicionar suporte para passar `state` com user info

## Detalhes Técnicos

### Modificações na Edge Function

```typescript
// Novo handler GET para OAuth callback
if (req.method === 'GET') {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // JSON com user_id, org_id
  
  // 1. Trocar code por token
  // 2. Buscar páginas do usuário
  // 3. Retornar HTML com postMessage
}

// Função para gerar página de sucesso
function generateSuccessPage(pages: MetaPage[]): string {
  return `
    <script>
      window.opener.postMessage({
        type: 'META_OAUTH_SUCCESS',
        pages: ${JSON.stringify(pages)},
        userToken: '...'
      }, '*');
      window.close();
    </script>
  `;
}
```

### Modificações no Frontend

```typescript
// Listener para mensagens do popup
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'META_OAUTH_SUCCESS') {
      setAvailablePages(event.data.pages);
      setUserToken(event.data.userToken);
      setShowPageSelector(true);
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);

// Abrir popup com redirect para Edge Function
const handleConnect = async () => {
  const callbackUrl = `${SUPABASE_URL}/functions/v1/meta-oauth`;
  // state contém informações para validação
  const state = btoa(JSON.stringify({ timestamp: Date.now() }));
  
  window.open(authUrl, '_blank', 'width=600,height=700');
};
```

## Configuração Necessária no Facebook Developers

Após a implementação, será necessário adicionar a nova URI de redirect:
- **Valid OAuth Redirect URI:** `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/meta-oauth`

## Benefícios

- Experiência fluida sem necessidade de fechar abas manualmente
- Usuário permanece na página onde iniciou o processo
- Padrão consistente com outras integrações (Google Calendar)
- Funciona mesmo se cookies de terceiros estiverem bloqueados

## Sequência de Implementação

1. Atualizar Edge Function `meta-oauth` com handler GET e geração de HTML
2. Modificar frontend para usar `postMessage` listener
3. Atualizar `handleConnect()` para novo fluxo
4. Remover lógica antiga de `useSearchParams` callback
5. Testar fluxo completo
