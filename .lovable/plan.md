
## Correção: Mensagens WhatsApp não sendo registradas

### Problema Identificado

O webhook da Evolution API para a instancia `gabrielbrasil_81839_7pg` esta apontando para um **projeto Supabase errado**.

No arquivo `src/pages/WhatsAppSettings.tsx` (linha 68), a URL do webhook esta hardcoded como:
```
https://ulodfqdmoalttgbxrutj.supabase.co/functions/v1/evolution-webhook
```

O projeto correto e `iemalzlfnbouobyjwlwi`. Isso significa que quando o webhook e (re)configurado pela pagina de configuracoes, os eventos da Evolution API (mensagens recebidas, atualizacoes de status) vao para o projeto errado e nunca chegam ao banco de dados.

As mensagens **enviadas** pelo app funcionam porque sao salvas diretamente pelo frontend via `evolution-proxy`. Mas mensagens **recebidas** dependem do webhook, que esta apontando pro lugar errado.

### Solucao

**Arquivo:** `src/pages/WhatsAppSettings.tsx`
- Substituir a URL hardcoded pela URL dinamica usando a variavel de ambiente `VITE_SUPABASE_URL`
- Isso garante que o webhook sempre aponte para o projeto correto, mesmo se o projeto mudar

```text
ANTES:
const webhookUrl = `https://ulodfqdmoalttgbxrutj.supabase.co/functions/v1/evolution-webhook`;

DEPOIS:
const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-webhook`;
```

**Apos o deploy do codigo**, sera necessario **reconfigurar o webhook** para as instancias afetadas. Isso pode ser feito de duas formas:
1. Pela pagina de configuracoes do WhatsApp, clicando em "Configurar Webhook" para cada instancia
2. Ou desconectando e reconectando a instancia (que recria o webhook automaticamente via `evolution-proxy`)

### Instancias Afetadas

Todas as instancias que tiveram o webhook configurado pela pagina de configuracoes podem estar com a URL errada. A instancia `gabrielbrasil_81839_7pg` e uma delas confirmada.

### Resumo Tecnico

```text
Arquivo modificado:
1. src/pages/WhatsAppSettings.tsx
   - Linha 68: Trocar URL hardcoded por import.meta.env.VITE_SUPABASE_URL

Acao pos-deploy:
- Reconfigurar webhook em todas as instancias ativas via pagina de configuracoes
```
