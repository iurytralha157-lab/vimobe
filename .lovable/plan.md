

# Plano: Sistema de Automações Completo com Follow-up

## Visão Geral

O sistema atual de automações possui uma **estrutura sólida** com ReactFlow para edição visual, mas precisa de melhorias significativas para funcionar 100% e incluir o sistema de Follow-up que você solicitou.

---

## Diagnóstico do Sistema Atual

### O que já existe:
- Editor visual com ReactFlow (trigger, action, condition, delay nodes)
- Edge Functions: `automation-trigger`, `automation-executor`, `automation-runner`
- Suporte a múltiplos gatilhos: mensagem recebida, lead criado, mudança de etapa, tag adicionada
- Ações: enviar WhatsApp, mover lead, adicionar/remover tag, criar tarefa, webhook

### Problemas Identificados:

1. **Delay sem scheduler**: O delay salva `next_execution_at` mas não há cron/scheduler que processe execuções em "waiting"
2. **Delay mal configurado**: O delay usa `delay_type` + `delay_value` no frontend mas o executor espera `delay_minutes/hours/days`
3. **Resposta automática não funcional**: Não há integração com o webhook do WhatsApp para disparar automações
4. **Sem templates de follow-up prontos**: Não existe sistema de templates pré-configurados
5. **UI/UX pode melhorar**: Falta visualização do status das execuções, histórico, logs

---

## Solução Proposta

### 1. Criar Edge Function `automation-delay-processor`

Nova função que será chamada por cron (a cada 1 minuto) para processar execuções aguardando:

```typescript
// Pseudocódigo
1. Buscar execuções com status = 'waiting' e next_execution_at <= NOW()
2. Para cada execução:
   - Mudar status para 'running'
   - Chamar automation-executor
```

### 2. Corrigir Processamento de Delay

Atualizar `automation-executor` para interpretar corretamente os campos:
- `delay_type`: 'minutes' | 'hours' | 'days'
- `delay_value`: número

### 3. Integrar com WhatsApp Webhook

Modificar `evolution-webhook` para disparar automações quando mensagens são recebidas:
- Chamar `automation-trigger` com `event_type: 'message_received'`

### 4. Sistema de Follow-up com Templates Prontos

Criar interface para:
- Templates de follow-up de 3, 6, 10 dias
- Mensagens pré-escritas para mercado imobiliário
- Seleção de instância WhatsApp
- Personalização das mensagens

### 5. Melhorar UI/UX

- Cards de templates prontos na listagem
- Visualização de execuções (histórico)
- Logs de execução por automação
- Status visual das automações

---

## Arquitetura do Sistema de Follow-up

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CRIAÇÃO DE FOLLOW-UP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │  Follow-up     │  │  Follow-up     │  │  Follow-up     │     │
│  │   3 Dias       │  │   6 Dias       │  │  10 Dias       │     │
│  │                │  │                │  │                │     │
│  │ • 3 mensagens  │  │ • 6 mensagens  │  │ • 10 mensagens │     │
│  │ • Intervalo 1d │  │ • Intervalo 1d │  │ • Intervalo 1d │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ CONFIGURAÇÃO:                                            │    │
│  │ • Gatilho: Lead criado / Tag adicionada / Manual        │    │
│  │ • Instância WhatsApp: [Dropdown com sessões]            │    │
│  │ • Mensagens: Personalizáveis com variáveis              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUÇÃO DO FOLLOW-UP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [TRIGGER]──▶[Dia 1: Msg]──▶[Delay 1d]──▶[Dia 2: Msg]──▶...    │
│                                                                  │
│  Status: ⏳ Aguardando │ ▶️ Executando │ ✅ Concluído │ ❌ Erro │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/automation-delay-processor/index.ts` | Processa execuções em waiting |
| `src/components/automations/FollowUpTemplates.tsx` | Cards de templates prontos |
| `src/components/automations/FollowUpWizard.tsx` | Wizard para criar follow-up |
| `src/components/automations/ExecutionHistory.tsx` | Histórico de execuções |
| `src/components/automations/FollowUpMessageEditor.tsx` | Editor de mensagens do follow-up |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/automation-executor/index.ts` | Corrigir processamento de delay |
| `supabase/functions/evolution-webhook/index.ts` | Integrar com automation-trigger |
| `src/pages/Automations.tsx` | Adicionar tabs (Automações / Follow-up / Histórico) |
| `src/components/automations/AutomationList.tsx` | Melhorar UI com status |
| `src/components/automations/NodeConfigPanel.tsx` | Melhorar configuração de delay |
| `src/hooks/use-automations.ts` | Adicionar hooks para follow-up e execuções |
| `supabase/config.toml` | Adicionar nova função |

---

## Mensagens de Follow-up Pré-configuradas (Mercado Imobiliário)

### Template 3 Dias:

**Dia 1:**
> Olá {{lead.name}}! 👋
> 
> Aqui é da [Imobiliária]. Vi que você demonstrou interesse em nossos imóveis.
> 
> Posso ajudar a encontrar o imóvel perfeito para você? Qual região você está procurando?

**Dia 2:**
> Oi {{lead.name}}, tudo bem? 
> 
> Só passando para lembrar que estamos à disposição para ajudar na sua busca!
> 
> Temos ótimas opções disponíveis. Quer que eu envie algumas sugestões?

**Dia 3:**
> {{lead.name}}, última mensagem! 😊
> 
> Caso ainda esteja procurando imóvel, ficarei feliz em ajudar.
> 
> Se mudar de ideia, é só me chamar aqui!

### Template 6 Dias e 10 Dias:
(Seguem o mesmo padrão, com mensagens progressivamente mais espaçadas e com tom diferente)

---

## Fluxo de Resposta Automática (WhatsApp)

```text
┌────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Mensagem      │ ───▶ │ evolution-      │ ───▶ │ automation-      │
│  Recebida      │      │ webhook         │      │ trigger          │
└────────────────┘      └─────────────────┘      └────────┬─────────┘
                                                          │
                        ┌─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ VERIFICA:                                                        │
│ • Existe automação ativa com trigger 'message_received'?        │
│ • Keyword configurada bate com a mensagem?                      │
│ • Sessão WhatsApp corresponde?                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼ (Se sim)
┌─────────────────────────────────────────────────────────────────┐
│ EXECUTA AUTOMAÇÃO:                                               │
│ • Cria execution record                                         │
│ • Processa nós (ação, condição, delay)                         │
│ • Envia resposta automática                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detalhamento Técnico

### 1. automation-delay-processor (Nova Edge Function)

```typescript
// Busca execuções prontas para continuar
const { data: waitingExecutions } = await supabase
  .from('automation_executions')
  .select('id')
  .eq('status', 'waiting')
  .lte('next_execution_at', new Date().toISOString());

// Para cada uma, chama o executor
for (const exec of waitingExecutions) {
  await supabase
    .from('automation_executions')
    .update({ status: 'running' })
    .eq('id', exec.id);
  
  await fetch(`${SUPABASE_URL}/functions/v1/automation-executor`, {
    method: 'POST',
    body: JSON.stringify({ execution_id: exec.id })
  });
}
```

### 2. Correção do Delay no Executor

```typescript
// ANTES (incorreto)
const delayMinutes = nodeConfig.delay_minutes || 0;

// DEPOIS (correto)
const delayType = nodeConfig.delay_type || 'minutes';
const delayValue = nodeConfig.delay_value || 5;

let totalDelayMs = 0;
switch (delayType) {
  case 'minutes': totalDelayMs = delayValue * 60 * 1000; break;
  case 'hours': totalDelayMs = delayValue * 60 * 60 * 1000; break;
  case 'days': totalDelayMs = delayValue * 24 * 60 * 60 * 1000; break;
}
```

### 3. Integração com evolution-webhook

```typescript
// Adicionar no evolution-webhook após processar mensagem
if (isIncomingMessage) {
  await fetch(`${SUPABASE_URL}/functions/v1/automation-trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'message_received',
      data: {
        session_id: sessionId,
        conversation_id: conversation.id,
        lead_id: lead?.id,
        message: messageText,
      }
    })
  });
}
```

---

## Nova Interface de Automações

```text
┌─────────────────────────────────────────────────────────────────┐
│ AUTOMAÇÕES                                          [+ Nova]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │Automações│ │Follow-up│ │Histórico│                           │
│  └────┬────┘ └─────────┘ └─────────┘                           │
│       │                                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📦 TEMPLATES PRONTOS                                        │ │
│  │                                                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │ │
│  │  │ 📱 3 Dias │  │ 📱 6 Dias │  │📱 10 Dias│  [+ Criar]    │ │
│  │  │ Follow-up│  │ Follow-up│  │ Follow-up│                 │ │
│  │  └──────────┘  └──────────┘  └──────────┘                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🔧 SUAS AUTOMAÇÕES                                          │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │ 📨 Boas-vindas WhatsApp            [Ativa] [Toggle] │   │ │
│  │  │ Gatilho: Lead Criado  •  Último run: há 2h          │   │ │
│  │  │ ✅ 45 execuções  ❌ 2 erros                         │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │ 🔄 Follow-up 6 dias                 [Ativa] [Toggle] │   │ │
│  │  │ Gatilho: Tag "Interessado"  •  ⏳ 12 em andamento   │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementação em Fases

### Fase 1: Correções Críticas (Backend Funcional)
1. Criar `automation-delay-processor`
2. Corrigir processamento de delay no executor
3. Integrar evolution-webhook com automation-trigger
4. Configurar cron job para delay-processor

### Fase 2: Sistema de Follow-up
1. Criar templates de follow-up
2. Criar wizard de configuração
3. Salvar como automação visual (nós conectados)

### Fase 3: Melhorias de UI/UX
1. Tabs na página de automações
2. Cards de templates
3. Histórico de execuções
4. Status e métricas

### Fase 4: Resposta Automática Inteligente
1. Configuração de keywords
2. Respostas condicionais
3. Integração com IA (futuro)

---

## Cronograma Estimado

| Fase | Descrição | Tempo |
|------|-----------|-------|
| 1 | Correções críticas (backend) | 1-2 horas |
| 2 | Sistema de follow-up | 2-3 horas |
| 3 | Melhorias de UI/UX | 1-2 horas |
| 4 | Resposta automática | 1 hora |

**Total estimado: 5-8 horas de desenvolvimento**

---

## Benefícios

1. **Follow-up automatizado**: Leads nunca ficam esquecidos
2. **Templates prontos**: Corretores podem ativar em segundos
3. **Resposta automática**: Clientes recebem resposta imediata
4. **Visibilidade**: Histórico e métricas de execução
5. **Flexibilidade**: Personalização total das mensagens
6. **Multi-instância**: Cada corretor pode usar sua própria sessão WhatsApp

