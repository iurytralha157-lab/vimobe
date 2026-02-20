
## Agente de IA para Atendimento Automático via WhatsApp

### Visão Geral

Criar um sistema completo de agente de IA que intercepta mensagens de WhatsApp recebidas, responde automaticamente usando OpenAI ou Gemini, e transfere para humano quando necessário. O sistema se integra ao fluxo existente do `evolution-webhook` sem quebrar nada.

---

### Arquitetura do Sistema

```text
WhatsApp (usuário)
       ↓
evolution-webhook (já existe)
       ↓ (mensagem recebida, não fromMe, não grupo)
   [NOVO] Verificar se conversa tem agente ativo
       ↓ sim
   [NOVA] Edge function: ai-agent-responder
       ↓
   OpenAI / Gemini API
       ↓
   outbox_messages → message-sender → WhatsApp
```

---

### O que será criado

#### 1. Migration SQL

Criar as duas tabelas solicitadas + RLS:

**`ai_agents`** — configuração do agente por organização:
```sql
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id uuid REFERENCES whatsapp_sessions(id),
  name text NOT NULL DEFAULT 'Assistente',
  is_active boolean DEFAULT true,
  ai_provider text DEFAULT 'openai',
  system_prompt text,
  handoff_keywords text[],
  max_messages_before_handoff integer DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**`ai_agent_conversations`** — estado de cada conversa atendida pela IA:
```sql
CREATE TABLE public.ai_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id),
  status text DEFAULT 'active',
  message_count integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  handed_off_at timestamptz,
  UNIQUE(conversation_id)
);
```

RLS: somente usuários da mesma organização podem ler/escrever. Admins têm acesso total.

---

#### 2. Edge Function: `ai-agent-responder`

Nova edge function em `supabase/functions/ai-agent-responder/index.ts`:

**Responsabilidades:**
1. Recebe `{ conversation_id, session_id, organization_id, message, contact_name }`
2. Busca o agente ativo para a sessão (ou organização)
3. Verifica se a conversa já está sendo atendida pela IA (`ai_agent_conversations`)
4. Se sim: verifica handoff por keywords ou por `max_messages_before_handoff`
5. Busca histórico das últimas 20 mensagens da conversa
6. Busca contexto do lead (campos da tabela `leads`) e propriedades/planos disponíveis
7. Chama OpenAI (gpt-4o-mini) ou Gemini com system prompt + histórico + mensagem atual
8. Salva resposta no `outbox_messages` para envio via `message-sender`
9. Incrementa `message_count` na `ai_agent_conversations`

**System prompt padrão** (pode ser sobrescrito via `ai_agents.system_prompt`):
```
Você é um assistente de atendimento imobiliário. Responda de forma amigável e profissional...
```

**Lógica de handoff:**
- Se a mensagem contém alguma keyword de `handoff_keywords` → status = `handed_off`
- Se `message_count >= max_messages_before_handoff` → status = `handed_off`
- Quando handed off: enviar mensagem "Transferindo para um atendente..." e parar de responder

**Contexto injetado no prompt:**
```
[CONTEXTO DO LEAD]
Nome: João Silva
Telefone: 11999999999
Cidade: São Paulo / Bairro: Pinheiros

[PROPRIEDADES DISPONÍVEIS - últimas 5]
Casa em Pinheiros, 3 quartos, R$ 850.000
Apartamento no Centro, 2 quartos, R$ 420.000
...
```

---

#### 3. Integração no `evolution-webhook`

Adicionar chamada ao `ai-agent-responder` após salvar a mensagem recebida, **no bloco existente** de mensagens não enviadas por nós (`!fromMe && !isGroup`), logo após o trigger de automação (linha ~622):

```typescript
// AI Agent: check if this conversation should be handled by AI
if (!fromMe && !isGroup && content && messageType === 'text') {
  try {
    await fetch(`${supabaseUrl}/functions/v1/ai-agent-responder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        session_id: session.id,
        organization_id: session.organization_id,
        message: content,
        contact_name: contactName,
      }),
    });
  } catch (aiError) {
    console.error("AI agent error:", aiError);
  }
}
```

---

#### 4. UI de Configuração do Agente

**Nova página/aba** acessível em Configurações → WhatsApp → IA ou via menu CRM Management:

Componente `src/components/settings/AIAgentTab.tsx`:

- **Toggle** para ativar/desativar o agente
- **Seletor de sessão WhatsApp** — qual número o agente usa
- **Provedor de IA**: OpenAI ou Gemini (radio buttons)
- **Textarea**: system prompt personalizado
- **Tags**: handoff_keywords (input com chips)
- **Slider/input**: max_messages_before_handoff (padrão: 20)
- **Histórico**: lista de conversas atendidas pela IA com status (ativo, transferido, concluído)

Hook: `src/hooks/use-ai-agents.ts` — CRUD para `ai_agents` + query de `ai_agent_conversations`.

---

#### 5. Secrets necessários

Será necessário configurar **pelo menos um** dos secrets:
- `OPENAI_API_KEY` — para usar gpt-4o-mini (recomendado, mais barato)
- `GEMINI_API_KEY` — para usar Gemini 1.5 Flash

Ambos podem coexistir; o agente escolhe baseado em `ai_agents.ai_provider`.

---

### Sequência de implementação

| Passo | O que fazer |
|---|---|
| 1 | Migration SQL: criar `ai_agents` e `ai_agent_conversations` com RLS |
| 2 | Solicitar secrets `OPENAI_API_KEY` e `GEMINI_API_KEY` |
| 3 | Criar edge function `ai-agent-responder` |
| 4 | Editar `evolution-webhook` para chamar o agente |
| 5 | Criar hook `use-ai-agents.ts` |
| 6 | Criar componente `AIAgentTab.tsx` e integrá-lo em Settings |

### Impacto no sistema existente

- `evolution-webhook`: apenas adiciona uma chamada `fetch` assíncrona no final do bloco de mensagens recebidas. Não altera lógica existente.
- `message-sender`: sem mudanças — agente usa o mesmo `outbox_messages` existente.
- Automações: continuam funcionando independentemente. O agente roda em paralelo.

### Pré-requisito crítico

Precisará de pelo menos um API key (OpenAI ou Gemini) configurado como secret no Supabase para a edge function funcionar.
