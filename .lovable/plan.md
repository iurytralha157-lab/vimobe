
# Corrigir Notificacoes WhatsApp

## Problema Identificado

O `whatsapp-notifier` tem **zero logs** -- nunca foi chamado com sucesso. A causa raiz:

- **Leads do Meta (maioria)**: Chegam via `meta-webhook` -> trigger `handle_lead_intake` no banco de dados. O trigger cria notificacoes na tabela `notifications`, mas **nao tem como chamar a edge function `whatsapp-notifier`** (triggers de banco nao podem chamar edge functions).

- **Leads manuais (frontend)**: O `notifyLeadCreated()` e chamado e deveria invocar o `whatsapp-notifier`, mas o `handle_lead_intake` ja cria as notificacoes na tabela, gerando **notificacoes duplicadas** no sistema.

## Solucao Proposta

Usar o mecanismo de **`pg_net`** (extensao do Supabase) para chamar a edge function `whatsapp-notifier` diretamente de dentro do banco de dados, apos a atribuicao do lead no `handle_lead_intake`.

### Etapa 1: Criar funcao de notificacao WhatsApp no banco

Criar uma funcao PL/pgSQL que usa `net.http_post` (extensao `pg_net` do Supabase) para chamar o `whatsapp-notifier`:

```text
notify_whatsapp_on_lead(organization_id, user_id, message)
  -> POST para whatsapp-notifier via pg_net
```

### Etapa 2: Atualizar `handle_lead_intake`

Apos atribuir o lead a um usuario (round-robin ou admin fallback), chamar `notify_whatsapp_on_lead` passando o `assigned_user_id`, `organization_id` e a mensagem formatada.

### Etapa 3: Remover chamada duplicada do frontend

Remover a chamada ao `whatsapp-notifier` de dentro do `notifyLeadCreated()` em `use-lead-notifications.ts` (linhas 131-144), pois agora o banco fara isso. Manter a chamada do `use-deal-status-change.ts` (lead ganho) e do `use-whatsapp-health-monitor.ts` (alertas de saude) pois esses fluxos nao passam pelo trigger.

### Etapa 4: Remover criacao duplicada de notificacoes

Avaliar se `notifyLeadCreated()` deve ser removido completamente do frontend para leads manuais, ja que o trigger `handle_lead_intake` ja cria as notificacoes. Para leads manuais que ja vem com `assigned_user_id`, o trigger nao dispara (ele retorna se ja tem responsavel), entao o frontend precisa continuar criando notificacoes para esse caso -- mas sem a parte do WhatsApp que agora esta no banco.

---

## Detalhes Tecnicos

### Migration SQL

```sql
-- Habilitar pg_net se nao estiver
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Funcao auxiliar para notificar via WhatsApp
CREATE OR REPLACE FUNCTION notify_whatsapp_on_lead(
  p_org_id uuid,
  p_user_id uuid,
  p_lead_name text,
  p_source text DEFAULT 'desconhecida'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Se configs nao disponiveis, usar vault ou hardcode URL
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://iemalzlfnbouobyjwlwi.supabase.co';
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/whatsapp-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'organization_id', p_org_id,
      'user_id', p_user_id,
      'message', format(
        E'\U0001F195 *Novo Lead Recebido!*\nNome: %s\nOrigem: %s\nAcesse o CRM para mais detalhes.',
        p_lead_name, p_source
      )
    )
  );
END;
$$;
```

### Alteracao no `handle_lead_intake`

Em cada ponto onde o lead e atribuido (round-robin e fallbacks admin), adicionar:

```sql
PERFORM notify_whatsapp_on_lead(v_org_id, v_next_user_id, v_lead.name, v_lead.source);
```

### Arquivo: `src/hooks/use-lead-notifications.ts`

Remover linhas 131-144 (chamada ao `whatsapp-notifier`), mantendo o restante da funcao intacto para notificacoes de sistema (tabela `notifications`).

### Arquivos que mantem chamada ao `whatsapp-notifier` (sem alteracao)

- `src/hooks/use-deal-status-change.ts` -- notificacao de lead ganho
- `src/hooks/use-whatsapp-health-monitor.ts` -- alerta de sessao desconectada

### Consideracao sobre `pg_net` e `service_role_key`

O `pg_net` precisa do `service_role_key` para autenticar na edge function. No Supabase, esse valor esta disponivel via vault ou pode ser configurado como `app.settings`. Se nao estiver acessivel, a alternativa e configurar o `whatsapp-notifier` com `verify_jwt = false` (ja esta assim no `config.toml`), permitindo a chamada sem Authorization header -- mas usando o `apikey` (anon key) no header.
