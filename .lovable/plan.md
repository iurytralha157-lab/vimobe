

# Configurar Cron Job do Pool-Checker

## Situação Atual

O sistema de redistribuição (Pool) está **implementado mas inativo** porque não há um agendamento automático chamando a Edge Function `pool-checker`.

## Solução

Criar um cron job que execute a cada **1-2 minutos** para verificar leads pendentes de redistribuição.

## SQL a Executar

O seguinte comando deve ser executado no Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'pool-checker',
  '*/2 * * * *',  -- A cada 2 minutos
  $$
  SELECT net.http_post(
    url := 'https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/pool-checker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbWFsemxmbmJvdW9ieWp3bHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjQ1ODYsImV4cCI6MjA4MzUwMDU4Nn0.81N4uCUaIFOm7DHMaHa9Rhh-OoY06j6Ig4AFibzXuQU'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Como Funciona

```text
Cron executa a cada 2 minutos
          │
          ▼
pool-checker busca leads onde:
├── first_response_at IS NULL
├── assigned_at < (agora - timeout_minutos)
└── redistribution_count < max_redistributions
          │
          ▼
Para cada lead encontrado:
├── Atribuir ao próximo corretor da fila
├── Incrementar redistribution_count
├── Registrar no histórico
└── Reiniciar o timer
```

## Configuração na Interface

Após executar o SQL, você pode **ativar o Pool** na aba "Redistribuição" da página de Gestão:

1. Selecione a pipeline desejada
2. Ative "Redistribuição automática"
3. Configure:
   - **Tempo limite**: Minutos para o corretor fazer contato (ex: 10 min)
   - **Máximo de redistribuições**: Quantas vezes tentar antes de parar (ex: 3)

## Verificação

Após ativar, você pode monitorar os logs da função em:
**Supabase Dashboard → Edge Functions → pool-checker → Logs**

