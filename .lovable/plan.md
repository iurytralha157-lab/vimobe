

## Limpeza Automatica de Notificacoes (Retencao de 15 dias)

### Objetivo
Manter apenas as notificacoes dos ultimos 15 dias no banco. A cada 15 dias, uma rotina automatica apaga tudo que for mais antigo.

### Como funciona

1. **Edge Function `cleanup-notifications`** - Deleta todas as notificacoes com `created_at` anterior a 15 dias atras
2. **Cron Job (pg_cron)** - Executa a edge function a cada 15 dias automaticamente

### Implementacao

**1. Criar Edge Function: `supabase/functions/cleanup-notifications/index.ts`**
- Recebe requisicao (POST do cron)
- Conecta ao banco com service_role
- Executa: `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '15 days'`
- Retorna quantidade de registros removidos

**2. Registrar no `supabase/config.toml`**
- Adicionar `[functions.cleanup-notifications]` com `verify_jwt = false`

**3. Criar Cron Job via SQL**
- Agendar execucao a cada 15 dias usando `pg_cron` e `pg_net`
- Schedule: `0 3 1,16 * *` (dias 1 e 16 de cada mes, as 3h da manha)
- Chama a edge function via HTTP POST

### Detalhes Tecnicos

**Edge Function:**
```text
- Usa createClient com SUPABASE_SERVICE_ROLE_KEY
- Query: DELETE FROM notifications WHERE created_at < now() - interval '15 days'
- Log: quantidade deletada
- CORS headers padrao
```

**Cron SQL (executar manualmente no SQL Editor):**
```text
SELECT cron.schedule(
  'cleanup-notifications-biweekly',
  '0 3 1,16 * *',
  $$ SELECT net.http_post(...) $$
);
```

Isso garante que as extensoes `pg_cron` e `pg_net` precisam estar habilitadas no projeto Supabase.

### Impacto
- Notificacoes lidas e nao-lidas com mais de 15 dias serao removidas
- O contador de nao-lidas e a listagem se atualizam automaticamente (ja usam queries em tempo real)
- Reducao constante do volume da tabela `notifications` (hoje ~5.300 registros)

