
# Plano: Melhorar Histórico de Automações e Adicionar Notificações

## Problemas Identificados

### 1. Automação trava no "waiting" e não continua
O `automation-delay-processor` existe mas **não tem cron job configurado**. Por isso, após enviar a primeira mensagem e entrar em "waiting", ninguém chama a função para continuar o fluxo.

### 2. Erro truncado no histórico
A mensagem de erro aparece como `Failed to send WhatsApp: {"statu...` porque está limitada a 200px com `truncate`.

### 3. Falta de notificações
Não há notificações para:
- Automação iniciada
- Automação concluída
- Automação com erro

### 4. Histórico não mostra nome do lead/automação
Mostra apenas "Lead" genérico ao invés do nome real.

---

## Solução

### Parte 1: Configurar Cron Job para o Delay Processor

Criar uma migration que configura o `pg_cron` para chamar o `automation-delay-processor` a cada minuto:

```sql
SELECT cron.schedule(
  'automation-delay-processor',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/automation-delay-processor',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### Parte 2: Melhorar ExecutionHistory.tsx

1. **Buscar dados relacionados** - Fazer join com `leads.name` e `automations.name`
2. **Mostrar erro completo** - Remover `truncate` e permitir expansão do erro
3. **Exibir nome do lead e automação** - Em vez de "Lead", mostrar "André Rocha - Follow-up 3 Dias"

```text
┌─────────────────────────────────────────────────────────────┐
│ 🔴 André Rocha                     Concluído há 26 minutos  │
│    Follow-up 3 Dias                                         │
│    Iniciado há 26 minutos                                   │
│                                                             │
│    ⚠️ Erro: Número WhatsApp inválido (22974063727)          │
│       Clique para ver detalhes                              │
└─────────────────────────────────────────────────────────────┘
```

### Parte 3: Adicionar Notificações de Automação

Modificar o `automation-executor` para criar notificações:

1. **Ao iniciar** (quando a execução é criada):
   - Título: `🤖 Automação Iniciada`
   - Conteúdo: `"Follow-up 3 Dias" iniciou para André Rocha`

2. **Ao concluir com sucesso**:
   - Título: `✅ Automação Concluída`
   - Conteúdo: `"Follow-up 3 Dias" finalizou para André Rocha`

3. **Ao falhar**:
   - Título: `❌ Automação Falhou`
   - Conteúdo: `"Follow-up 3 Dias" falhou para André Rocha: Número WhatsApp inválido`

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/new.sql` | Configurar cron job para automation-delay-processor |
| `supabase/functions/automation-trigger/index.ts` | Enviar notificação ao criar execução |
| `supabase/functions/automation-executor/index.ts` | Enviar notificações de conclusão/erro |
| `src/hooks/use-automations.ts` | Buscar dados de lead e automação nas execuções |
| `src/components/automations/ExecutionHistory.tsx` | Exibir nome do lead/automação e erro expandido |

### Notificação - Estrutura

```typescript
// Inserir na tabela notifications
{
  user_id: lead.assigned_user_id || automation.created_by,
  organization_id: execution.organization_id,
  title: "🤖 Automação Iniciada",
  content: `"${automation.name}" iniciou para ${lead.name}`,
  type: "automation",
  lead_id: execution.lead_id
}
```

### Lógica de Notificação

1. **Quem recebe**: O usuário responsável pelo lead (assigned_user_id) OU o criador da automação se não tiver responsável
2. **Tipo**: `automation` - para diferenciar no frontend e tocar som específico

### Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────┐
│  LEAD MOVIDO PARA ETAPA                                     │
│         │                                                   │
│         ▼                                                   │
│  automation-trigger                                         │
│  ├─ Cria execution (status: running)                       │
│  ├─ 🔔 NOTIFICA: "Automação Iniciada"                      │
│  └─ Chama automation-executor                               │
│         │                                                   │
│         ▼                                                   │
│  automation-executor                                        │
│  ├─ Envia mensagem WhatsApp                                │
│  ├─ Encontra nó "delay"                                    │
│  └─ Atualiza status para "waiting"                         │
│         │                                                   │
│         ▼ (1 minuto depois)                                 │
│  automation-delay-processor (via cron)                      │
│  ├─ Encontra execuções com next_execution_at <= agora      │
│  └─ Chama automation-executor para continuar                │
│         │                                                   │
│         ▼                                                   │
│  automation-executor                                        │
│  ├─ Envia segunda mensagem                                 │
│  ├─ Sem mais nós → marca "completed"                       │
│  └─ 🔔 NOTIFICA: "Automação Concluída"                     │
└─────────────────────────────────────────────────────────────┘
```

### Tratamento de Erros no Histórico

Erros comuns serão traduzidos para português:
- `exists: false` → "Número WhatsApp inválido ou não cadastrado"
- `Connection refused` → "Falha na conexão com WhatsApp"
- `timeout` → "Tempo limite excedido"

---

## Benefícios

1. **Automações continuam funcionando** - Cron job processa os delays corretamente
2. **Erros legíveis** - Usuário entende o que aconteceu
3. **Notificações proativas** - Usuário fica sabendo em tempo real do status
4. **Histórico rico** - Nome do lead e da automação visíveis
