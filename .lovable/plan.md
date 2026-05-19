
# Correção da Integração Evolution Go

## Diagnóstico

A API alvo é a **Evolution Go (Evolution Foundation / whatsmeow)** — documentada em `docs.evolutionfoundation.com.br/evolution-go`. Ela **não é compatível** com a Evolution API v2 (Node). Diferenças críticas:

| Tema | Implementação atual (errada) | Evolution Go real |
|---|---|---|
| Body de `/instance/create` | `{ instanceName, qrcode, webhook }` | `{ name, token?, proxy? }` ← causa do erro `name is required` |
| Identificação da instância nas chamadas | Header `instanceId` com `instance_name` como fallback | Header `instanceId` (UUID retornado pelo `/instance/create`, campo `data.id`) |
| Webhook | Configurado em `/instance/create` | Configurado em `/instance/connect` (`{ webhookUrl, subscribe, immediate }`) |
| QR Code | `GET /instance/qr` (sem body) | `GET /instance/qr` retorna `qrcode` base64; QR também é entregue por webhook após `connect` |
| Resposta de criação | `result.data.success` | `result.data.data.id`, `result.data.message === "success"` |
| Endpoints inexistentes hoje no proxy | `/chat/history-sync-request`, `/instance/forcereconnect/{x}`, `/instance/get/{x}`, `/group/description`, `/chat/unarchive`, `/chat/unmute` | Não existem nessa API — precisam ser removidos ou remapeados |

Além disso, hoje **nunca salvamos o `instance_id` (UUID)** retornado pelo `/instance/create` na linha `whatsapp_sessions`, então toda chamada subsequente cai no fallback `instance_name`, que a API não reconhece como `instanceId` válido.

---

## Mudanças

### 1. `supabase/functions/evolution-go-proxy/index.ts`
- **`instance.create`**: mapear `payload.body.instanceName` (ou `payload.body.name`) para `{ name, token?, proxy? }` antes de chamar `/instance/create`. Descartar `qrcode` e `webhook` do body.
- **`instance.connect`**: aceitar `{ webhookUrl, subscribe, immediate }` no body (com defaults `subscribe: ["ALL"]`, `immediate: true`).
- **`buildCall` corrigir endpoints**:
  - Remover `chat.historySync` (não existe).
  - Remover `instance.forceReconnect` e `instance.get` (não existem); substituir por `instance.connect` no fluxo do frontend.
  - `chat.unarchive` → reusar `/chat/archive` com `{ archive: false }`.
  - `chat.unmute` → reusar `/chat/mute` com `{ mute: false }` (ou remover se não suportado).
  - `group.setDescription` → remover (não documentado).
- **Logging**: incluir `console.log` com `status`, `path`, e body de erro (`data.error`/`data.message`) sempre que `!res.ok`, para facilitar debug nos Edge Function logs.
- **Surface de erro**: retornar `error` derivado de `data.error.message || data.message` quando status ≠ 2xx, para o frontend mostrar mensagem real.

### 2. `src/hooks/use-whatsapp-sessions.ts` — `useCreateWhatsAppSession`
- Trocar body do `instance.create` para `{ name: uniqueInstanceName }` (sem `qrcode`/`webhook`).
- Após sucesso, ler `result.data?.data?.id` e fazer `UPDATE whatsapp_sessions SET instance_id = <id>` na linha recém-criada.
- Em seguida, disparar `instance.connect` automaticamente com `{ webhookUrl, subscribe: ["ALL"], immediate: true }` — assim o webhook é registrado e o QR é gerado.
- Melhorar tratamento de erro: ler `result.error || result.data?.error?.message || result.data?.message` antes de cair no genérico.

### 3. `src/components/settings/WhatsAppTab.tsx`
- O botão "Reconectar" / refresh QR deve chamar `instance.connect` (com webhookUrl) em vez de `createInstance` para sessões `evolution_go`.
- `refreshQRCode` para `evolution_go` deve chamar `instance.qr` passando `session_id` (para o proxy resolver `instance_id` do DB).

### 4. `src/hooks/use-whatsapp-labels.ts`, `use-whatsapp-groups.ts`, `use-whatsapp-contacts.ts`
- Garantir que todas as chamadas para `evolution-go-proxy` enviem `session_id` em vez de `instance_id` literal, deixando o proxy resolver via DB.
- Remover qualquer dependência de endpoints removidos (`group.setDescription`, `chat.unarchive`, etc.) — esconder botões correspondentes na UI.

### 5. `supabase/functions/evolution-go-webhook/index.ts`
- Confirmar que o payload do webhook do Evolution Go bate com o handler (eventos `MESSAGE`, `CONNECTION`, `QRCODE`, `LABEL`, `GROUP`, `CONTACT` em formato Go). Se não bater, mapear no início do handler para o shape esperado.

### 6. Validação
- Após deploy do proxy, executar `supabase--curl_edge_functions` com `action: "instance.create"` usando um JWT válido (peço o usuário fazer login) para confirmar 200 + `data.id`.
- Olhar logs do `evolution-go-proxy` para garantir que não há mais "name is required".

---

## Detalhes Técnicos

```ts
// evolution-go-proxy/index.ts — buildCall
case "instance.create": {
  const b = payload.body ?? {};
  return {
    method: "POST",
    path: "/instance/create",
    body: { name: b.name ?? b.instanceName, token: b.token, proxy: b.proxy },
  };
}
case "instance.connect": {
  const b = payload.body ?? {};
  return {
    method: "POST",
    path: "/instance/connect",
    body: {
      webhookUrl: b.webhookUrl,
      subscribe: b.subscribe ?? ["ALL"],
      immediate: b.immediate ?? true,
    },
    instanceId: inst,
  };
}
```

```ts
// use-whatsapp-sessions.ts — fluxo evolution_go
// 1) /instance/create
const createRes = await supabase.functions.invoke("evolution-go-proxy", {
  body: { action: "instance.create", body: { name: uniqueInstanceName } },
});
const evoId = createRes.data?.data?.data?.id;
if (!evoId) throw new Error(createRes.data?.error || "Falha ao criar instância");

// 2) salvar UUID
await supabase
  .from("whatsapp_sessions")
  .update({ instance_id: evoId } as any)
  .eq("id", session.id);

// 3) /instance/connect com webhook
const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-go-webhook`;
await supabase.functions.invoke("evolution-go-proxy", {
  body: {
    action: "instance.connect",
    instance_id: evoId,
    body: { webhookUrl, subscribe: ["ALL"], immediate: true },
  },
});
```

---

## Riscos / Pontos a confirmar
- A doc Postman menciona `integration: "WHATSAPP-BAILEYS"` no body de create — provavelmente legado de cópia da Evolution v2. Vou enviar **apenas `name`** (conforme OpenAPI oficial). Se a build do servidor exigir mais campos, ajusto via logs.
- Algumas sessões antigas no DB (`evolution_go`) ficaram sem `instance_id`. Vou criar um botão "Reconfigurar" que reaplica create+connect, OU já mandar a migração de UPDATE setando `instance_id = instance_name` para servir de fallback temporário (até reconectar).

Posso prosseguir?
