
# Notificacoes via WhatsApp - Sessao de Notificacao

## Resumo

Permitir que o administrador marque uma sessao de WhatsApp como "sessao de notificacao" da organizacao. Essa sessao sera usada para enviar mensagens automaticas via WhatsApp para os usuarios do CRM quando ocorrerem eventos importantes: novo lead recebido, lead ganho e WhatsApp desconectado.

## O que muda para o usuario

1. Na pagina de Configuracoes > WhatsApp, cada card de sessao ganha um botao/switch "Usar para notificacoes"
2. Apenas UMA sessao pode ser marcada como notificacao por vez (ao ativar uma, desativa a anterior)
3. Quando ativada, o sistema envia mensagens WhatsApp automaticas para os usuarios afetados nos seguintes eventos:
   - **Novo lead recebido** - notifica o corretor atribuido
   - **Lead ganho** (deal_status = 'won') - notifica o corretor responsavel
   - **WhatsApp desconectado** - notifica o dono da sessao e admins

## Detalhes Tecnicos

### 1. Migracao de Banco de Dados

Adicionar coluna `is_notification_session` na tabela `whatsapp_sessions`:

```text
ALTER TABLE whatsapp_sessions ADD COLUMN is_notification_session boolean DEFAULT false;
```

Criar funcao para garantir apenas uma sessao de notificacao por organizacao:

```text
CREATE OR REPLACE FUNCTION ensure_single_notification_session()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_notification_session = true THEN
    UPDATE whatsapp_sessions 
    SET is_notification_session = false 
    WHERE organization_id = NEW.organization_id 
      AND id != NEW.id 
      AND is_notification_session = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_single_notification_session
  BEFORE INSERT OR UPDATE OF is_notification_session ON whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION ensure_single_notification_session();
```

### 2. Nova Edge Function: `whatsapp-notifier`

Uma edge function dedicada que recebe um payload com:
- `organization_id` - para encontrar a sessao de notificacao
- `user_id` - usuario que deve receber a mensagem
- `message` - texto da mensagem

Fluxo:
1. Busca a sessao marcada como `is_notification_session = true` na organizacao
2. Verifica se a sessao esta `connected`
3. Busca o telefone do usuario destino na tabela `users`
4. Envia a mensagem via Evolution API (`sendText`)

### 3. Integracao nos Pontos de Disparo

| Evento | Onde acontece | Acao |
|---|---|---|
| Novo lead recebido | `use-lead-notifications.ts` (funcao `notifyLeadCreated`) | Apos inserir notificacoes no banco, chama `whatsapp-notifier` para o `assignedUserId` |
| Lead ganho | `use-deal-status-change.ts` (ao mudar `deal_status` para `won`) | Chama `whatsapp-notifier` para o `assigned_user_id` do lead |
| WhatsApp desconectado | `use-whatsapp-health-monitor.ts` (apos detectar 2 falhas) | Chama `whatsapp-notifier` para o `owner_user_id` da sessao |

### 4. Alteracoes no Frontend

**`src/components/settings/WhatsAppTab.tsx`:**
- Adicionar um Switch ou botao de "sino" em cada card de sessao
- Ao ativar, faz `UPDATE whatsapp_sessions SET is_notification_session = true WHERE id = session.id`
- Exibir badge visual "Notificacoes" na sessao ativa
- Somente administradores podem alterar essa configuracao

### 5. Arquivos Alterados/Criados

| Arquivo | Tipo | Descricao |
|---|---|---|
| Migracao SQL | Novo | Adicionar coluna e trigger |
| `supabase/functions/whatsapp-notifier/index.ts` | Novo | Edge function para enviar notificacoes via WhatsApp |
| `src/components/settings/WhatsAppTab.tsx` | Alterado | Adicionar switch de "sessao de notificacao" nos cards |
| `src/hooks/use-whatsapp-sessions.ts` | Alterado | Adicionar `is_notification_session` no tipo e hook de toggle |
| `src/hooks/use-lead-notifications.ts` | Alterado | Chamar `whatsapp-notifier` apos criar notificacoes de novo lead |
| `src/hooks/use-deal-status-change.ts` | Alterado | Chamar `whatsapp-notifier` quando lead for ganho |
| `src/hooks/use-whatsapp-health-monitor.ts` | Alterado | Chamar `whatsapp-notifier` quando sessao desconectar |
| `supabase/config.toml` | Alterado | Registrar nova edge function |

### 6. Formato das Mensagens WhatsApp

```text
Novo Lead:
"🆕 *Novo Lead Recebido!*
Nome: {leadName}
Origem: {source}
Acesse o CRM para mais detalhes."

Lead Ganho:
"🎉 *Lead Ganho!*
Nome: {leadName}
Parabens pela venda!"

WhatsApp Desconectado:
"⚠️ *WhatsApp Desconectado*
A sessao '{sessionName}' perdeu a conexao.
Acesse as configuracoes para reconectar."
```
