
# Plano: Notificação de Lead Recuperado + Mensagem Padrão nos Templates

## O que você pediu

1. **Notificação "Lead Recuperado"** - Quando o lead responde e a automação para, enviar notificação
2. **Mensagem padrão para quando lead responde** - Adicionar uma mensagem automática tipo "Que bom que se interessou!"

---

## Solução

### Parte 1: Notificação "Lead Recuperado!"

Quando o lead responde e a automação é cancelada, vamos criar uma notificação para o responsável:

```text
🎉 Lead Recuperado!
"André Rocha" respondeu ao follow-up "Follow-up 3 Dias"
```

**Onde implementar:** Dentro da função `handleStopFollowUpOnReply` no `evolution-webhook`, logo após cancelar a execução.

### Parte 2: Mensagem Automática ao Responder (Novo nó!)

Adicionar nas configurações de "Parar ao responder" a opção de enviar uma mensagem automática quando o lead responde:

```text
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Configurações de Resposta                               │
│                                                             │
│  ☑ Parar ao responder                                      │
│                                                             │
│  ├─ Mover para etapa: [Qualificados ▼]                     │
│  │                                                         │
│  └─ Mensagem ao responder:                                 │
│     ┌─────────────────────────────────────────────────────┐│
│     │ Olá {{lead.name}}! 🎉                               ││
│     │                                                     ││
│     │ Que bom que você se interessou!                    ││
│     │ Nossa equipe entrará em contato em breve.          ││
│     └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Parte 3: Mensagem Padrão nos Templates

Adicionar uma mensagem sugerida para todos os templates:

```typescript
// Mensagem padrão quando lead responde
const DEFAULT_ON_REPLY_MESSAGE = `Olá {{lead.name}}! 🎉

Que bom que você se interessou!
Nossa equipe entrará em contato em breve para te atender.`;
```

---

## Fluxo Completo

```text
┌───────────────────────────────────────────────────────────────────────┐
│  LEAD RESPONDE NO WHATSAPP                                            │
│         │                                                             │
│         ▼                                                             │
│  evolution-webhook                                                    │
│  ├─ handleStopFollowUpOnReply()                                       │
│  │         │                                                          │
│  │         ▼                                                          │
│  │  ✅ Cancela automação (status: cancelled)                          │
│  │         │                                                          │
│  │         ▼                                                          │
│  │  📱 Envia mensagem de resposta (se configurada)                    │
│  │  "Que bom que você se interessou!"                                │
│  │         │                                                          │
│  │         ▼                                                          │
│  │  🔔 NOTIFICA: "Lead Recuperado!"                                   │
│  │  "André respondeu ao Follow-up 3 Dias"                            │
│  │         │                                                          │
│  │         ▼                                                          │
│  │  🚀 Move lead para etapa configurada                               │
│  │                                                                    │
│  └─ ✅ Lead recuperado com sucesso!                                   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/evolution-webhook/index.ts` | Adicionar notificação e envio de mensagem em `handleStopFollowUpOnReply` |
| `src/components/automations/FollowUpBuilder.tsx` | Adicionar campo de "Mensagem ao responder" nas configurações |
| `src/components/automations/FollowUpBuilderEdit.tsx` | Mesmo campo para edição |
| `src/components/automations/FollowUpTemplates.tsx` | Adicionar mensagem padrão pré-configurada |

### Nova Configuração no trigger_config

```typescript
trigger_config: {
  stop_on_reply: true,
  on_reply_move_to_stage_id: "uuid",
  on_reply_message: "Olá {{lead.name}}! Que bom que se interessou..." // NOVO
}
```

### Notificação - Estrutura

```typescript
{
  user_id: leadInfo.assigned_user_id || automation.created_by,
  organization_id: session.organization_id,
  lead_id: leadId,
  title: "🎉 Lead Recuperado!",
  content: `"${leadName}" respondeu ao follow-up "${automationName}"`,
  type: "lead"
}
```

---

## Templates Atualizados

Todos os templates (3 dias, 6 dias, 10 dias) virão com uma mensagem sugerida de resposta:

```text
Olá {{lead.name}}! 🎉

Que bom que você se interessou!
Nossa equipe entrará em contato em breve para te atender.

Enquanto isso, posso te ajudar com algo?
```

---

## Benefícios

1. **Visibilidade total** - Você recebe notificação assim que um lead responde
2. **Resposta instantânea** - Lead recebe mensagem automática de confirmação
3. **Menos trabalho manual** - Mensagem já vem pré-configurada nos templates
4. **Experiência profissional** - Lead sabe que foi ouvido e será atendido
